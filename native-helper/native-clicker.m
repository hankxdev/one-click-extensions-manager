#import <ApplicationServices/ApplicationServices.h>
#import <Cocoa/Cocoa.h>
#include <unistd.h>

static const uint32_t MaxNativeMessageLength = 1024 * 1024;

static NSString *StringAttribute(AXUIElementRef element, CFStringRef attribute) {
	CFTypeRef value = NULL;
	if (AXUIElementCopyAttributeValue(element, attribute, &value) != kAXErrorSuccess || value == NULL) {
		return @"";
	}

	NSString *result = @"";
	if (CFGetTypeID(value) == CFStringGetTypeID()) {
		result = [NSString stringWithString:(__bridge NSString *)value];
	} else if (CFGetTypeID(value) == CFNumberGetTypeID()) {
		result = [(__bridge NSNumber *)value stringValue];
	} else {
		result = [[(__bridge id)value description] ?: @"" copy];
	}

	CFRelease(value);
	return result;
}

static NSArray *ChildrenOfElement(AXUIElementRef element) {
	CFTypeRef value = NULL;
	if (AXUIElementCopyAttributeValue(element, kAXChildrenAttribute, &value) != kAXErrorSuccess || value == NULL) {
		return @[];
	}

	NSArray *children = CFGetTypeID(value) == CFArrayGetTypeID()
		? [NSArray arrayWithArray:(__bridge NSArray *)value]
		: @[];
	CFRelease(value);
	return children;
}

static BOOL ContainsTarget(AXUIElementRef element, NSString *target) {
	NSMutableString *text = [NSMutableString string];
	for (id attribute in @[
		(__bridge NSString *)kAXDescriptionAttribute,
		(__bridge NSString *)kAXTitleAttribute,
		(__bridge NSString *)kAXValueAttribute,
		(__bridge NSString *)kAXHelpAttribute,
	]) {
		NSString *part = StringAttribute(element, (__bridge CFStringRef)attribute);
		if (part.length > 0) {
			[text appendString:part];
			[text appendString:@"\n"];
		}
	}

	return [text rangeOfString:target options:NSCaseInsensitiveSearch | NSDiacriticInsensitiveSearch].location != NSNotFound;
}

static BOOL ClickElement(AXUIElementRef element) {
	CFTypeRef positionValue = NULL;
	CFTypeRef sizeValue = NULL;
	if (
		AXUIElementCopyAttributeValue(element, kAXPositionAttribute, &positionValue) == kAXErrorSuccess &&
		AXUIElementCopyAttributeValue(element, kAXSizeAttribute, &sizeValue) == kAXErrorSuccess &&
		positionValue != NULL &&
		sizeValue != NULL
	) {
		CGPoint position;
		CGSize size;
		BOOL hasPosition = AXValueGetValue(positionValue, kAXValueCGPointType, &position);
		BOOL hasSize = AXValueGetValue(sizeValue, kAXValueCGSizeType, &size);
		CFRelease(positionValue);
		CFRelease(sizeValue);

		if (hasPosition && hasSize) {
			CGPoint point = CGPointMake(position.x + (size.width / 2), position.y + (size.height / 2));
			CGEventRef down = CGEventCreateMouseEvent(NULL, kCGEventLeftMouseDown, point, kCGMouseButtonLeft);
			CGEventRef up = CGEventCreateMouseEvent(NULL, kCGEventLeftMouseUp, point, kCGMouseButtonLeft);
			if (down != NULL && up != NULL) {
				CGEventPost(kCGHIDEventTap, down);
				usleep(80 * 1000);
				CGEventPost(kCGHIDEventTap, up);
				CFRelease(down);
				CFRelease(up);
				return YES;
			}

			if (down != NULL) {
				CFRelease(down);
			}

			if (up != NULL) {
				CFRelease(up);
			}
		}
	} else {
		if (positionValue != NULL) {
			CFRelease(positionValue);
		}

		if (sizeValue != NULL) {
			CFRelease(sizeValue);
		}
	}

	return AXUIElementPerformAction(element, kAXPressAction) == kAXErrorSuccess;
}

static BOOL ScrollElement(AXUIElementRef element, int32_t delta) {
	CFTypeRef positionValue = NULL;
	CFTypeRef sizeValue = NULL;
	if (
		AXUIElementCopyAttributeValue(element, kAXPositionAttribute, &positionValue) != kAXErrorSuccess ||
		AXUIElementCopyAttributeValue(element, kAXSizeAttribute, &sizeValue) != kAXErrorSuccess ||
		positionValue == NULL ||
		sizeValue == NULL
	) {
		if (positionValue != NULL) {
			CFRelease(positionValue);
		}

		if (sizeValue != NULL) {
			CFRelease(sizeValue);
		}

		return NO;
	}

	CGPoint position;
	CGSize size;
	BOOL hasPosition = AXValueGetValue(positionValue, kAXValueCGPointType, &position);
	BOOL hasSize = AXValueGetValue(sizeValue, kAXValueCGSizeType, &size);
	CFRelease(positionValue);
	CFRelease(sizeValue);
	if (!hasPosition || !hasSize) {
		return NO;
	}

	CGPoint point = CGPointMake(position.x + (size.width / 2), position.y + (size.height / 2));
	CGEventRef move = CGEventCreateMouseEvent(NULL, kCGEventMouseMoved, point, kCGMouseButtonLeft);
	CGEventRef scroll = CGEventCreateScrollWheelEvent(NULL, kCGScrollEventUnitLine, 1, delta);
	if (move == NULL || scroll == NULL) {
		if (move != NULL) {
			CFRelease(move);
		}

		if (scroll != NULL) {
			CFRelease(scroll);
		}

		return NO;
	}

	CGEventPost(kCGHIDEventTap, move);
	usleep(30 * 1000);
	CGEventPost(kCGHIDEventTap, scroll);
	CFRelease(move);
	CFRelease(scroll);
	return YES;
}

static BOOL ClickToolbarItem(AXUIElementRef element, NSString *target, NSInteger depth, BOOL insideToolbar) {
	if (depth > 12) {
		return NO;
	}

	NSString *role = StringAttribute(element, kAXRoleAttribute);
	BOOL nowInsideToolbar = insideToolbar || [role isEqualToString:@"AXToolbar"];
	if (nowInsideToolbar && ContainsTarget(element, target) && ClickElement(element)) {
		return YES;
	}

	for (id child in ChildrenOfElement(element)) {
		if (ClickToolbarItem((__bridge AXUIElementRef)child, target, depth + 1, nowInsideToolbar)) {
			return YES;
		}
	}

	return NO;
}

static BOOL ClickTextItem(AXUIElementRef element, NSString *target, NSInteger depth) {
	if (depth > 12) {
		return NO;
	}

	if (ContainsTarget(element, target) && ClickElement(element)) {
		return YES;
	}

	for (id child in ChildrenOfElement(element)) {
		if (ClickTextItem((__bridge AXUIElementRef)child, target, depth + 1)) {
			return YES;
		}
	}

	return NO;
}

static NSArray *WindowsOfApplication(AXUIElementRef application) {
	CFTypeRef value = NULL;
	if (AXUIElementCopyAttributeValue(application, kAXWindowsAttribute, &value) != kAXErrorSuccess || value == NULL) {
		return @[];
	}

	NSArray *windows = CFGetTypeID(value) == CFArrayGetTypeID()
		? [NSArray arrayWithArray:(__bridge NSArray *)value]
		: @[];
	CFRelease(value);
	return windows;
}

static pid_t FindApplicationPid(NSString *browserApp) {
	for (NSRunningApplication *application in [[NSWorkspace sharedWorkspace] runningApplications]) {
		if (
			[[application localizedName] isEqualToString:browserApp] ||
			([browserApp isEqualToString:@"Brave Browser"] && [[application bundleIdentifier] isEqualToString:@"com.brave.Browser"]) ||
			([browserApp isEqualToString:@"Google Chrome"] && [[application bundleIdentifier] isEqualToString:@"com.google.Chrome"]) ||
			([browserApp isEqualToString:@"Chromium"] && [[application bundleIdentifier] isEqualToString:@"org.chromium.Chromium"])
		) {
			return [application processIdentifier];
		}
	}

	return -1;
}

static BOOL ClickAnyToolbarAlias(AXUIElementRef application, NSArray *targets) {
	for (NSString *target in targets) {
		for (id window in WindowsOfApplication(application)) {
			if (ClickToolbarItem((__bridge AXUIElementRef)window, target, 0, NO)) {
				return YES;
			}
		}
	}

	return NO;
}

static BOOL ClickAnyMenuAlias(AXUIElementRef application, NSArray *targets) {
	NSArray *windows = WindowsOfApplication(application);
	for (NSString *target in targets) {
		for (id window in windows) {
			NSString *subrole = StringAttribute((__bridge AXUIElementRef)window, kAXSubroleAttribute);
			if (![subrole isEqualToString:@"AXStandardWindow"] && ClickTextItem((__bridge AXUIElementRef)window, target, 0)) {
				return YES;
			}
		}
	}

	for (NSString *target in targets) {
		for (id window in windows) {
			if (ClickTextItem((__bridge AXUIElementRef)window, target, 0)) {
				return YES;
			}
		}
	}

	for (NSUInteger attempt = 0; attempt < 8; attempt++) {
		BOOL scrolled = NO;
		for (id window in windows) {
			NSString *subrole = StringAttribute((__bridge AXUIElementRef)window, kAXSubroleAttribute);
			if (![subrole isEqualToString:@"AXStandardWindow"]) {
				scrolled = ScrollElement((__bridge AXUIElementRef)window, -8) || scrolled;
			}
		}

		if (!scrolled) {
			for (id window in windows) {
				scrolled = ScrollElement((__bridge AXUIElementRef)window, -8) || scrolled;
			}
		}

		if (!scrolled) {
			break;
		}

		usleep(120 * 1000);
		windows = WindowsOfApplication(application);
		for (NSString *target in targets) {
			for (id window in windows) {
				NSString *subrole = StringAttribute((__bridge AXUIElementRef)window, kAXSubroleAttribute);
				if (![subrole isEqualToString:@"AXStandardWindow"] && ClickTextItem((__bridge AXUIElementRef)window, target, 0)) {
					return YES;
				}
			}
		}

		for (NSString *target in targets) {
			for (id window in windows) {
				if (ClickTextItem((__bridge AXUIElementRef)window, target, 0)) {
					return YES;
				}
			}
		}
	}

	return NO;
}

static BOOL IsTrusted(BOOL prompt) {
	NSDictionary *options = @{(__bridge NSString *)kAXTrustedCheckOptionPrompt: @(prompt)};
	return AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);
}

static NSString *OpenPopup(NSString *browserApp, NSArray *targets, NSString **errorMessage) {
	pid_t pid = FindApplicationPid(browserApp);
	if (pid <= 0) {
		if (errorMessage != NULL) {
			*errorMessage = [NSString stringWithFormat:@"Could not find running browser app: %@", browserApp];
		}
		return nil;
	}

	for (NSRunningApplication *application in [[NSWorkspace sharedWorkspace] runningApplications]) {
		if ([application processIdentifier] == pid) {
			[application activateWithOptions:0];
			break;
		}
	}

	usleep(200 * 1000);
	AXUIElementRef application = AXUIElementCreateApplication(pid);
	if (ClickAnyToolbarAlias(application, targets)) {
		CFRelease(application);
		return @"clicked pinned toolbar item";
	}

	if (ClickAnyToolbarAlias(application, @[@"Extensions"])) {
		for (NSUInteger attempt = 0; attempt < 10; attempt++) {
			usleep(150 * 1000);
			if (ClickAnyMenuAlias(application, targets)) {
				CFRelease(application);
				return @"clicked extensions menu item";
			}
		}
	}

	CFRelease(application);
	if (errorMessage != NULL) {
		*errorMessage = @"Could not find the extension in the browser toolbar or Extensions menu.";
	}
	return nil;
}

static NSMutableData *ReadExact(int fileDescriptor, NSUInteger length) {
	NSMutableData *data = [NSMutableData dataWithLength:length];
	uint8_t *bytes = [data mutableBytes];
	NSUInteger offset = 0;

	while (offset < length) {
		ssize_t bytesRead = read(fileDescriptor, bytes + offset, length - offset);
		if (bytesRead <= 0) {
			break;
		}

		offset += (NSUInteger)bytesRead;
	}

	if (offset < length) {
		[data setLength:offset];
	}

	return data;
}

static int WriteNativeMessage(NSDictionary *message) {
	NSError *error = nil;
	NSData *body = [NSJSONSerialization dataWithJSONObject:message options:0 error:&error];
	if (body == nil) {
		return 1;
	}

	uint32_t length = (uint32_t)[body length];
	uint8_t header[4] = {
		(uint8_t)(length & 0xFF),
		(uint8_t)((length >> 8) & 0xFF),
		(uint8_t)((length >> 16) & 0xFF),
		(uint8_t)((length >> 24) & 0xFF),
	};

	if (write(STDOUT_FILENO, header, sizeof(header)) != sizeof(header)) {
		return 1;
	}

	if (write(STDOUT_FILENO, [body bytes], [body length]) != (ssize_t)[body length]) {
		return 1;
	}

	return 0;
}

static BOOL IsValidExtensionId(NSString *extensionId) {
	if (![extensionId isKindOfClass:[NSString class]] || [extensionId length] != 32) {
		return NO;
	}

	for (NSUInteger index = 0; index < [extensionId length]; index++) {
		unichar character = [extensionId characterAtIndex:index];
		if (character < 'a' || character > 'p') {
			return NO;
		}
	}

	return YES;
}

static NSDictionary *ReadConfig(NSString *executablePath) {
	NSString *configPath = [[executablePath stringByDeletingLastPathComponent] stringByAppendingPathComponent:@"native-host-config.json"];
	NSData *data = [NSData dataWithContentsOfFile:configPath];
	if (data == nil) {
		return @{};
	}

	id config = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
	return [config isKindOfClass:[NSDictionary class]] ? config : @{};
}

static int RunNativeHost(NSString *executablePath) {
	@try {
		NSMutableData *header = ReadExact(STDIN_FILENO, 4);
		if ([header length] < 4) {
			return WriteNativeMessage(@{@"ok": @NO, @"error": @"Truncated native message header."});
		}

		const uint8_t *headerBytes = [header bytes];
		uint32_t length =
			(uint32_t)headerBytes[0] |
			((uint32_t)headerBytes[1] << 8) |
			((uint32_t)headerBytes[2] << 16) |
			((uint32_t)headerBytes[3] << 24);
		if (length > MaxNativeMessageLength) {
			return WriteNativeMessage(@{@"ok": @NO, @"error": @"Native message body is too large."});
		}

		NSMutableData *body = ReadExact(STDIN_FILENO, length);
		if ([body length] < length) {
			return WriteNativeMessage(@{@"ok": @NO, @"error": @"Truncated native message body."});
		}

		id parsed = [NSJSONSerialization JSONObjectWithData:body options:0 error:nil];
		if (![parsed isKindOfClass:[NSDictionary class]]) {
			return WriteNativeMessage(@{@"ok": @NO, @"error": @"Invalid native helper request."});
		}

		NSDictionary *request = parsed;
		NSString *type = request[@"type"];
		NSString *extensionId = request[@"extensionId"];
		NSString *extensionName = request[@"extensionName"];
		id aliases = request[@"extensionAliases"];
		if (![type isEqualToString:@"open-extension-popup"]) {
			return WriteNativeMessage(@{@"ok": @NO, @"error": @"Unsupported native helper request type."});
		}

		if (!IsValidExtensionId(extensionId)) {
			return WriteNativeMessage(@{@"ok": @NO, @"error": @"Invalid extension id."});
		}

		if (![extensionName isKindOfClass:[NSString class]] || [extensionName length] == 0) {
			return WriteNativeMessage(@{@"ok": @NO, @"error": @"Invalid extension name."});
		}

		NSMutableArray *targets = [NSMutableArray arrayWithObject:extensionName];
		if ([aliases isKindOfClass:[NSArray class]]) {
			for (id alias in aliases) {
				if ([alias isKindOfClass:[NSString class]] && [alias length] > 0) {
					[targets addObject:alias];
				}
			}
		}

		if (!IsTrusted(NO)) {
			return WriteNativeMessage(@{
				@"ok": @NO,
				@"error": @"Accessibility permission is required. Grant access to native-host in System Settings > Privacy & Security > Accessibility, then try again.",
			});
		}

		NSDictionary *config = ReadConfig(executablePath);
		NSString *browserApp = [config[@"browserApp"] isKindOfClass:[NSString class]]
			? config[@"browserApp"]
			: @"Brave Browser";
		NSString *errorMessage = nil;
		NSString *detail = OpenPopup(browserApp, targets, &errorMessage);
		if (detail == nil) {
			return WriteNativeMessage(@{@"ok": @NO, @"error": errorMessage ?: @"Native host failed."});
		}

		return WriteNativeMessage(@{@"ok": @YES, @"detail": detail});
	} @catch (NSException *exception) {
		return WriteNativeMessage(@{@"ok": @NO, @"error": [exception reason] ?: @"Native host failed."});
	}
}

int main(int argc, const char *argv[]) {
	@autoreleasepool {
		NSString *executablePath = [[NSFileManager defaultManager] stringWithFileSystemRepresentation:argv[0] length:strlen(argv[0])];
		NSString *executableName = [executablePath lastPathComponent];
		if (argc == 2 && strcmp(argv[1], "--check") == 0) {
			BOOL trusted = IsTrusted(NO);
			printf("%s\n", trusted ? "trusted" : "not trusted");
			return trusted ? 0 : 3;
		}

		if (argc == 2 && strcmp(argv[1], "--prompt") == 0) {
			BOOL trusted = IsTrusted(YES);
			printf("%s\n", trusted ? "trusted" : "not trusted");
			return trusted ? 0 : 3;
		}

		if ([executableName isEqualToString:@"native-host"] || (argc == 2 && strcmp(argv[1], "--native-host") == 0)) {
			return RunNativeHost(executablePath);
		}

		if (argc != 3) {
			fprintf(stderr, "Usage: native-clicker <browser-app> '<json-name-array>'\n");
			return 2;
		}

		if (!IsTrusted(NO)) {
			fprintf(
				stderr,
				"Accessibility permission is required. Grant access to native-clicker in System Settings > Privacy & Security > Accessibility, then try again.\n"
			);
			return 3;
		}

		NSString *browserApp = [NSString stringWithUTF8String:argv[1]];
		NSData *jsonData = [[NSString stringWithUTF8String:argv[2]] dataUsingEncoding:NSUTF8StringEncoding];
		NSError *jsonError = nil;
		id parsed = [NSJSONSerialization JSONObjectWithData:jsonData options:0 error:&jsonError];
		if (![parsed isKindOfClass:[NSArray class]]) {
			fprintf(stderr, "Invalid target name array.\n");
			return 2;
		}

		NSMutableArray *targets = [NSMutableArray array];
		for (id value in (NSArray *)parsed) {
			if ([value isKindOfClass:[NSString class]] && [value length] > 0) {
				[targets addObject:value];
			}
		}

		if (targets.count == 0) {
			fprintf(stderr, "No target names were provided.\n");
			return 2;
		}

		NSString *errorMessage = nil;
		NSString *detail = OpenPopup(browserApp, targets, &errorMessage);
		if (detail != nil) {
			printf("%s\n", [detail UTF8String]);
			return 0;
		}

		fprintf(stderr, "%s\n", [errorMessage UTF8String]);
		return 5;
	}
}
