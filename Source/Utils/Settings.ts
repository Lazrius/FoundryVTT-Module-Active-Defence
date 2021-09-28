import Globals, {Assert, Pair} from "../Globals";
import Logger from "./Logger";

/*
* */

class Settings {
	private constructor() {
		Logger.Ok("Loading configuration settings.")
		this.SettingsList = [
			// Add settings items here
			[
				"activeDefenceChatName", {
					name: "Text to display on def roll",
					scope: "world", // or client
					type: String,
					hint: "When an active defence roll is conducted, what text should be displayed in the chat window",
					config: true, // It should appear in the configuration menu
					default: "Defence Roll",
				}
			]
		];
	}

	private static instance: Settings;

	public static Get(): Settings {
		if (Settings.instance)
			return Settings.instance;

		Settings.instance = new Settings();
		return Settings.instance;
	}

	private SettingsInit = false;
	public RegisterSettings(): void {
		if (this.SettingsInit)
			return;

		Assert(game instanceof Game);
		const g = game as Game;
		this.SettingsList.forEach((item) => {
			g.settings.register(Globals.ModuleName, item[0], item[1]);
		});

		this.SettingsInit = true;
	}

	public GetSetting(setting: string): unknown {
		if (!this.SettingsInit)
			this.RegisterSettings();

		const g = game as Game;
		return g.settings.get(Globals.ModuleName, setting);
	}

	private readonly SettingsList: ReadonlyArray<Pair<ClientSettings.PartialSetting>>;
}

export default Settings;