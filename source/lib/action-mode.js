export const actionPopupPosition = 'popup';

export function normalizeActionPosition(position) {
	return position === actionPopupPosition ? position : actionPopupPosition;
}
