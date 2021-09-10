import Logger from "./Utils/Logger";
import Settings from "./Utils/Settings"
import {ActorData} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

enum RollType
{
	Advantage,
	Normal,
	Disadvantage
}

enum RollMode
{
	PublicRoll,
	PrivateGMRoll,
	BlindGMRoll,
	Self
}

const RollActiveDefence = (ac: number, actor: ActorData, title: string, rollType: RollType, rollMode: RollMode, modifier: string) => {
	const g = game as Game;

	console.log(modifier);
	const roll1 = new Roll(`d20`).roll().total;
	const roll2 = new Roll(`d20`).roll().total;
	const rollResult = new Roll(`${roll1}`).roll().total;
	const rollResult2 = new Roll(`${roll2}`).roll().total;

	let modRoll1: number | undefined;
	let modRoll2: number | undefined;
	let modRollResult1: number | undefined;
	let modRollResult2: number | undefined;
	if (modifier.length !== 0)
	{
		modRoll1 = new Roll(modifier).roll().total;
		modRoll2 = new Roll(modifier).roll().total;
		modRollResult1 = new Roll(`${modRoll1}`).roll().total;
		modRollResult2 = new Roll(`${modRoll2}`).roll().total;
	}

	if (!rollResult || !rollResult2)
		return;

	const total1 = rollResult + (modRollResult1 === undefined ? 0 : modRollResult1) + ac;
	const total2 = rollResult2 + (modRollResult2 === undefined ? 0 : modRollResult2) + ac;

	let content = `
					<div class="dnd5e chat-card item-card" data-acor-id="${actor._id}">
					    <header class="card-header flexrow">
					        <img src="${actor.token.img}" title="" width="36" height="36" style="border: none;" />
					        <div class="dice-roll red-dual">
					            <h3>${title}</h3>
					            <div class="dice-result">
					                <div class="dice-formula dice-tooltip" style="display: none;">1d20 + ${ac} ${modifier.length !== 0 ? "+" : ""} ${modifier}</div>
					                <div class="dice-row">
					                    <div class="dice-row">
					                        <div class="tooltip dual-left">
					                            <div class="dice-tooltip" style="display: none;">
					                                <div class="dice">
					                                    <p class="part-formula">
					                                        1d20 + ${ac} ${modifier.length !== 0 ? "+" : ""} ${modifier}
					                                    </p>
					                                    <ol class="dice-rolls">
					                                        <li class="roll d20">${roll1}</li>
					                                        ${modRoll1 !== undefined ? "<li class=\"roll d20\">${modRoll1}</li>" : ""}
					                                    </ol>
					                                </div>
					                            </div>
					                        </div>
					                        <div class="tooltip dual-right">
					                            <div class="dice-tooltip" style="display: none;">
					                                <div class="dice">
					                                    <p class="part-formula">
					                                        1d20 + ${ac} ${modifier.length !== 0 ? "+" : ""} ${modifier}
					                                    </p>
					                                    <ol class="dice-rolls">
					                                        <li class="roll d20">${roll2}</li>
					                                        ${modRoll2 !== undefined ? "<li class=\"roll d20\">${modRoll2}</li>" : ""}
					                                    </ol>
					                                </div>
				                                </div>
					                        </div>
					                    </div>
					                </div>
					                <div class="dice-row">
					                    <h4 class="dice-total dual-left" style="%dice1%;%dice1Adv%;text-shadow: 0 0 1px;">${total1}</h4>
					                    <h4 class="dice-total dual-left" style="%dice2%;%dice2Adv%;text-shadow: 0 0 1px;">${total2}</h4>
					                </div>
					            </div>
					        </div>
					    </header>
						</br>
					</div>`;

	if (roll1 === 1) {
		content = content.replace("%dice1%", "color: red");
	}
	else if (roll1 === 20) {
		content = content.replace("%dice1%", "color: green");
	}
	else
		content = content.replace("%dice1%", "");

	if (roll2 === 1) {
		content = content.replace("%dice2%", "color: red");
	}
	else if (roll2 === 20) {
		content = content.replace("%dice2%", "color: green");
	}
	else
		content = content.replace("%dice2%", "");

	if (total1 > total2)
	{
		if (rollType == RollType.Advantage)
			content = content.replace("%dice2Adv%", "opacity: 0.5");
		else if (rollType == RollType.Disadvantage)
			content = content.replace("%dice1Adv%", "opacity: 0.5");
	}
	else if (total2 > total1)
	{
		if (rollType == RollType.Advantage)
			content = content.replace("%dice1Adv%", "opacity: 0.5");
		else if (rollType == RollType.Disadvantage)
			content = content.replace("%dice2Adv%", "opacity: 0.5");
	}

	let whisper: string[] | undefined = undefined;
	if (rollMode === RollMode.Self)
		whisper = [actor._id as string];
	else if (rollMode === RollMode.BlindGMRoll || rollMode === RollMode.PrivateGMRoll)
		whisper = g.users!.contents.filter(u => u.isGM).map(x => x._id as string);

	ChatMessage.create({
		user: g.user!._id,
		blind: rollMode === RollMode.BlindGMRoll,
		content: content,
		speaker: {
			actor: actor._id,
			token: actor.token._id,
			alias: actor.name
		},
		sound: CONFIG.sounds.dice,
		whisper: whisper
	});
}

const AddActiveDefenceClick = (app: ActorSheet, html: JQuery, data: any) => {
	const armourClassElement = html.find('h4').filter(':contains("Armor Class")');
	if (armourClassElement.length === 0) {
		Logger.Warn("Couldn't find armour class on current character sheet.")
		return;
	}

	armourClassElement.css('cursor', 'pointer');

	armourClassElement.on('click',async (event) => {
		event.preventDefault();

		let title = Settings.Get().GetSetting("activeDefenceChatName");
		if (!title || typeof title !== "string")
			title = "Defence Roll";

		const actorData = app.actor.data;
		const ac = (actorData.data as any).attributes.ac.value as number;

		const getSituationalModifier = (html: JQuery | HTMLElement): string => {
			const result = (html as JQuery).find('#situationalRollModifier');
			const val = result.val() as string;
			if (/(\d*)(d\d*)((?:[+*-](?:\d+))*)(?:\+(d\d*))?/g.test(val))
				return val;
			return "";
		}

		const getRollMode = (html: JQuery | HTMLElement): RollMode => {
			const result = (html as JQuery).find('#rollMode').find(":selected").text();
			switch (result)
			{
				case "Public Roll":
					return RollMode.PublicRoll;
				case "Private GM Roll":
					return RollMode.PrivateGMRoll;
				case "Blind GM Roll":
					return RollMode.BlindGMRoll;
				case "Self":
					return RollMode.Self;
				default:
					return RollMode.PublicRoll;
			}
		}

		new Dialog({
			title: title as string,
			content: `<form>
                        <div class="form-group">
					        <label>Situational Modifier</label>
					        <input type='text' id='situationalRollModifier' placeholder='1d4+2'/>
				        </div>
					    <div class='form-group'>
					        <label>Roll Visibility</label>
					        <select id='rollMode'>
					            <option selected>Public Roll</option>
					            <option>Private GM Roll</option>
					            <option>Blind GM Roll</option>
					            <option>Self</option>
							</select>
				        </div>
                      </form>`,
			buttons: {
				one: {
					label: "Advantage",
					callback: (html) => RollActiveDefence(ac, actorData, title as string,
						RollType.Advantage, getRollMode(html), getSituationalModifier(html))
				},
				two: {
					label: "Normal",
					callback: (html) => RollActiveDefence(ac, actorData, title as string,
						RollType.Normal, getRollMode(html), getSituationalModifier(html))
				},
				three: {
					label: "Disadvantage",
					callback: (html) => RollActiveDefence(ac, actorData, title as string,
						RollType.Disadvantage, getRollMode(html), getSituationalModifier(html))
				}
			},
			default: "two",
		}).render(true);
	});
}

export default AddActiveDefenceClick;