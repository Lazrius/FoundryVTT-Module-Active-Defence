export default {
	ModuleName: "foundryvtt-module-active-defence",
	IsModule: true, // If you are developing a system rather than a module, change this to false
}

// Pop some fairly universal types that we might use
export type Pair<T> = [string, T];
export const Assert = (value: boolean): void => {
	if (!value)
		throw Error("Assertion failed.");
};