import Logger from "./Utils/Logger";
import Settings from "./Utils/Settings";

import PreloadTemplates from "./PreloadTemplates";
import AddActiveDefenceClick, {ActiveDefenceClicked} from "./ActiveDefence";

Hooks.once("init", async () => {
	//CONFIG.debug.hooks = true;
	Settings.Get().RegisterSettings();
	await PreloadTemplates();
});

Hooks.once("setup", () => {
   Logger.Log("Module is being setup.")
});

Hooks.once("ready", () => {
	Logger.Ok("Module is now ready.");
	// Assign activeDefence to contain this function on the global object
	(game as any).activeDefence = ActiveDefenceClicked;
});

Hooks.on(`renderActorSheet`, (app: ActorSheet, html: JQuery) => {
	AddActiveDefenceClick(app, html);
});