import Logger from "./Utils/Logger";
import Settings from "./Utils/Settings";

import PreloadTemplates from "./PreloadTemplates";
import AddActiveDefenceClick from "./ActiveDefence";

Hooks.once("init", async () => {
	//CONFIG.debug.hooks = true;
	Settings.Get().RegisterSettings();
	await PreloadTemplates();
});

Hooks.once("setup", () => {
   Logger.Log("Template module is being setup.")
});

Hooks.once("ready", () => {
   Logger.Ok("Template module is now ready.");
});

Hooks.on(`renderActorSheet`, (app: ActorSheet, html: JQuery, data: any) => {
	AddActiveDefenceClick(app, html, data);
});