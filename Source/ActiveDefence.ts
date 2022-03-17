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

// Returns null if invalid, otherwise returns the string cleaned and ready to be inserted on the end of a dice roll
const CleanDiceString = (str: string | null): string | null => {
	if (str === null || str.length === 0)
		return null;

	const diceRegex = /^[+*-/]?\d+d\d+$/;
	const numberRegex = /^[-*+/]?\d+$/;

	// Remove the spaces to make this clean
	const clean = str.replace(new RegExp(' ', 'g'), '');

	// First lets see if they are single modifiers
	if (numberRegex.test(clean) || diceRegex.test(clean)) {
		if (isNaN(parseInt(clean[0])))
			return str;

		// If it's just a number/dice on its own, create a + symbol
		return "+" + str;
	}

	const isSymbol = (symbol: string): boolean => {
		switch (symbol) {
			case '*':
			case '/':
			case '+':
			case '-':
				return true;
			default:
				return false;
		}
	}

	const params = clean.split(/([*+-/])/g);
	if (params[0] === "")
		params.shift();

	let firstSymbol = false;
	for (let index = 0; index < params.length; index++) {
		const val = params[index];

		if (index === 0 && isSymbol(val)) {
			firstSymbol = true;
		}

		// this is disgusting and i hate it
		const even = index % 2 === 0;
		if (firstSymbol) {
			if (even) {
				if (!isSymbol(val)) {
					return null;
				}
			} else if (!diceRegex.test(val) && !numberRegex.test(val)) {
				return null;
			}
		} else {
			if (even) {
				if (!diceRegex.test(val) && !numberRegex.test(val)) {
					return null;
				}
			} else if (!isSymbol(val)) {
				return null;
			}
		}
	}

	// Return the original format or a modified string if it is missing a symbol
	return isNaN(parseInt(clean[0])) ? str : " + " + str;
}

const RollActiveDefence = async (ac: number, actor: ActorData, title: string, rollType: RollType, rollMode: RollMode, modifier: string | null) => {
	const g = game as Game;

	let rollStr = "d20";
	let isOne = false;

	switch (rollType) {
		case RollType.Normal:
			rollStr = "1" + rollStr;
			isOne = true;
			break;
		case RollType.Advantage:
			rollStr = "2" + rollStr;
			rollStr += "kh";
			break;
		case RollType.Disadvantage:
			rollStr = "2" + rollStr;
			rollStr += "kl";
			break;
	}

	modifier = CleanDiceString(modifier);
	if (modifier !== null)
		rollStr += modifier;

	const roll1 = await new Roll(rollStr).roll({ async: true });

	let whisper: string[] | null = null;
	if (rollMode === RollMode.Self)
		whisper = [actor._id as string];
	else if (rollMode === RollMode.BlindGMRoll || rollMode === RollMode.PrivateGMRoll)
		whisper = g.users?.contents.filter(u => u.isGM).map(x => x._id as string) || null;

	const dice1 = ((roll1.terms[0] as DiceTerm).results[0]).result as number;

	const total1 = dice1 + ac;

	let goodDice = 0;
	let badDice = 0;
	let endResult = 0;

	if (!isOne)
	{
		const dice2 = ((roll1.terms[0] as DiceTerm).results[1]).result as number;
		const total2 = dice2 + ac;

		const dice1Higher = dice1 >= dice2;

		// There has to be a better way to filter these dice
		switch (rollType) {
			case RollType.Advantage:
				endResult = total1 >= total2 ? total1 : total2;
				goodDice = dice1Higher ? dice1 : dice2;
				badDice = dice1Higher ? dice2 : dice1;
				break;
			case RollType.Disadvantage:
				endResult = total1 <= total2 ? total1 : total2;
				goodDice = dice1Higher ? dice2 : dice1;
				badDice = dice1Higher ? dice1 : dice2;
				break;
		}
	}
	else
	{
		endResult = total1;
		goodDice = dice1;
		//badDice = dice2;
	}

	let img = actor.token.img;
	if (actor.token.img === null || actor.token.img.includes('*'))
		img = actor.img;

	let content = `
					<div class="dnd5e chat-card item-card" data-acor-id="${actor._id}">
					    <header class="card-header flexrow">
					        <img alt='Avatar' src="${img}" title="" width="36" height="36" style="border: none;" />
					        <div class="dice-roll red-dual">
					            <h3>${title}</h3>
					            <div class="dice-result">
					                <div class="dice-formula dice-tooltip" style="display: none;">${rollStr}</div>
					                <div class="dice-row">
					                    <div class="dice-row">
					                        <div class="tooltip dual-left">
					                            <div class="dice-tooltip" style="display: none;">
					                                <section class="tooltip-part">
												        <div class="dice">
												            <header class="part-header flexrow">
												                <span class="part-formula">${rollStr} + ${ac}</span>
												                
												                <span class="part-total">${dice1}</span>
												            </header>
												            <ol class="dice-rolls">
												                <li class="roll die d20">${goodDice}</li>
												                ${badDice !== 0 ? '<li class="roll die d20 discarded">' + badDice + '</li>' : ''}
												            </ol>
												        </div>
												    </section>
					                            </div>
					                        </div>
					                    </div>
					                </div>
					                <div class="dice-row">
					                    <h4 class="dice-total dual-left" style="%dice1%;text-shadow: 0 0 1px;">${endResult}</h4>
					                </div>
					            </div>
					        </div>
					    </header>
						</br>
					</div>`;

	if (goodDice === 1) {
		content = content.replace("%dice1%", "color: red");
	}
	else if (goodDice === 20) {
		content = content.replace("%dice1%", "color: green");
	}
	else
		content = content.replace("%dice1%", "");


	ChatMessage.create({
		user: g.user?._id,
		blind: rollMode === RollMode.BlindGMRoll,
		content: content,
		speaker: {
			actor: actor._id,
			token: actor.token._id,
			alias: actor.name
		},
		sound: CONFIG.sounds.dice,
		whisper: whisper,
		type: CONST.CHAT_MESSAGE_TYPES.ROLL,
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		roll: roll1,
		rollMode: rollMode,
	});
}

export const ActiveDefenceClicked = (app: ActorData, extraTitleText?: string): void => {
	let title = Settings.Get().GetSetting("activeDefenceChatName");
	if (!title || typeof title !== "string")
		title = "Defence Roll";

	if (extraTitleText)
		title += "- " + extraTitleText;

	const ac = (app.data as any).attributes.ac.value as number;

	const getSituationalModifier = (html: JQuery | HTMLElement): string => {
		const result = (html as JQuery).find('#situationalRollModifier');
		return result.val() as string;
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

	const g = game as Game;
	const macroExists = (g.macros as Macros).find(x => x.name == "Active Defence");

	const scriptContent = `
	if (canvas.tokens.controlled.length === 0) {
		ui.notifications.warn('You need to select a token before using this macro!');
		return;
	}

	canvas.tokens.controlled.forEach(token => {
		game.activeDefence(token.actor.data, token.name);
	});`

	// noinspection JSUnresolvedFunction
	new Dialog({
		title: title as string,
		content: `
${macroExists ? "" : `<div class='form-group'>
	<button id='createMacroDialogButton' title='Create Macro' 
		style='height: 30px; background: rgba(0, 0, 0, 0.05); border: 2px groove #C9C7B8' 
		type='button' 
		onclick="(async () => {
				await Macro.create({
					name: 'Active Defence',
					type: 'script',
					img: 'icons/svg/shield.svg',
					command: \`${scriptContent}\`,
				}, { displaySheet: false });

				document.getElementById('createMacroDialogButton').remove();
				ui.notifications.info('Macro \\'Active Defence\\' created! Add it to your hotbar.');
})()">
	Generate Macro
	</button><br/>
</div>`}
<form id='active-defense-form'>
	<div class="form-group">
        <label>Formula</label>
        <input type="text" name="formula" value="1d20 + ${ac} + @bonus" disabled="">
    </div>
	<div class="form-group">
	    <label>Situational Modifier</label>
	    <input type='text' id='situationalRollModifier' placeholder='1d4+2'/>
	</div>
	<div class='form-group'>
	    <label>Roll Visibility</label>
	    <select class="roll-type-select" id='rollMode'>
            <optgroup label="Default Roll Mode">
	            <option value="roll" selected="">Public Roll</option>
	            <option value="gmroll">Private GM Roll</option>
	            <option value="blindroll">Blind GM Roll</option>
	            <option value="selfroll">Self Roll</option>
            </optgroup>
        </select>
	</div>
</form>
<script>
	$('#rollMode').val($('[name="rollMode"]').val());
	$('#active-defense-form').parent().parent().css('overflow-y', 'hidden');
</script>`,
		buttons: {
			one: {
				label: "Advantage",
				callback: (html) => RollActiveDefence(ac, app, title as string,
					RollType.Advantage, getRollMode(html), getSituationalModifier(html))
			},
			two: {
				label: "Normal",
				callback: (html) => RollActiveDefence(ac, app, title as string,
					RollType.Normal, getRollMode(html), getSituationalModifier(html))
			},
			three: {
				label: "Disadvantage",
				callback: (html) => RollActiveDefence(ac, app, title as string,
					RollType.Disadvantage, getRollMode(html), getSituationalModifier(html))
			}
		},
		default: "two",
	}).render(true);
}

const AddActiveDefenceClick = (app: ActorSheet, html: JQuery): void => {
	const armourClassElement = html.find('h4').filter(':contains("Armor Class")');
	if (armourClassElement.length === 0) {
		Logger.Warn("Couldn't find armour class on current character sheet.")
		return;
	}

	armourClassElement.css('cursor', 'pointer');

	armourClassElement.on('click',async (event) => {
		event.preventDefault();

		ActiveDefenceClicked(app.actor.data);
	});
}

export default AddActiveDefenceClick;