import Logger from "./Utils/Logger";
import Settings from "./Utils/Settings";

import PreloadTemplates from "./PreloadTemplates";
import AddActiveDefenceClick, {ActiveDefenceClicked} from "./ActiveDefence";
import {UserData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

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

Hooks.on('getSceneControlButtons', (buttons: SceneControl[]) => {
	const token = buttons.find(b => b.name == "token");

	if (token) {
		token.tools.push({
			name: "roll-active-defence",
			title: 'Roll Active Defence',
			icon: "fas fa-shield-alt",
			visible: true,
			onClick: () => {
				const g = game as Game;
				const user = g.user as User;
				if ((user.data as UserData).role === CONST.USER_ROLES.GAMEMASTER && g.modules.has("lmrtfy")) {
					let content = `<div class="form-group" id='roll-selected-actors' style='display: flex'>`;

					const actors = g.actors as Actors;
					actors.forEach(actor => {
						if (!actor.hasPlayerOwner)
							return;

						content += `<div data-id="${actor.id}}" style="position: relative; flex: 0 0 45px; margin-left: 4px;">
                            <input onclick="{ 
                            	const input = $(this);
                            	const img = input.next().children().first();
                            	if (input.is(':checked')) {	
                            		img.css('box-shadow', '0 0 3px 3px #ffcc');
                            	} else {
                            		img.css('box-shadow', '');
                            	}
                            	
                            }" type="checkbox" name="${actor.id}" id="def-actor-${actor.id}" data-dtype="Boolean" style='display: none;' />
                            <label style='flex: 1;' for="def-actor-${actor.id}">
                                <img alt='${actor.name}' src="${actor.img}"
                                style='width: 50px; height: 50px; transform-origin: 50% 50%; border: none; border-radius: 2px;'/>
                            </label>
                        </div>`;
					});

					content += "</div>";
					new Dialog({
						title: "Who is rolling for defence?",
						content: content,
						buttons: {
							one: {
								label: "ROLL!",
								callback: (html) => {
									const selectedActors: string[] = [];
									(html as JQuery).find('#roll-selected-actors input:checked').each(function() {
										selectedActors.push($(this).attr('name') as string);
									});

									if (selectedActors.length === 0) {
										ui?.notifications?.warn('You need to select someone to roll!.');
										return;
									}

									selectedActors.forEach(id => {
										const actor = actors.find(x => x.id === id);
										if (!actor)
											return;

										let found = false;
										((g.users as Users).players as User[]).forEach(x => {
											if ((x.data as UserData).character === id) {
												const data = {
													"user": x.id,
													"actors": [
														id
													],
													"abilities": [],
													"saves": [],
													"skills": [],
													"advantage": 2,
													"mode": "roll",
													"title": "Get Rolling!",
													"message": "You're being attacked. Roll for defence!",
													"formula": "1d20 + @attributes.ac.value",
													"deathsave": false,
													"initiative": false
												};

												g.socket?.emit('module.lmrtfy', data);
												found = true;
												return;
											}
										});

										if (!found) {
											Logger.Err(`Actor ID ${id}'s user did not have a character bound to them.`);
										}
									});
								}
							}
						},
						default: "one",
					}).render(true);
				} else {
					if(!(canvas?.tokens?.controlled.length)) {
						ui?.notifications?.warn('You need to select a token before using this.');
						return;
					}

					canvas?.tokens?.controlled.forEach(token => {
						// Suppress mean typescript :angry:
						const q = game as any;
						q.activeDefence(token.actor?.data, token.name);
					});
				}
			},
			button: true
		});
	}
});