#include <mach-o/dyld.h>
#include <limits.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

#ifndef OCEM_NODE_BIN
#define OCEM_NODE_BIN "/usr/bin/node"
#endif

int main(void) {
	char executable_path[PATH_MAX];
	uint32_t size = sizeof(executable_path);

	if (_NSGetExecutablePath(executable_path, &size) != 0) {
		fprintf(stderr, "native-host path is too long\n");
		return 1;
	}

	char *slash = strrchr(executable_path, '/');
	if (slash == NULL) {
		fprintf(stderr, "native-host path is invalid\n");
		return 1;
	}

	*slash = '\0';

	char script_path[PATH_MAX];
	if (snprintf(script_path, sizeof(script_path), "%s/native-host.mjs", executable_path) >= (int)sizeof(script_path)) {
		fprintf(stderr, "native-host script path is too long\n");
		return 1;
	}

	char *const argv[] = {OCEM_NODE_BIN, script_path, NULL};
	execv(OCEM_NODE_BIN, argv);
	perror("execv");
	return 1;
}
