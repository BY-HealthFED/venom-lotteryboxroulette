import s from './game.scss';
import { htmlFactory } from '@byhealth/walle';
const { inlineStyle } = htmlFactory;
import { getFullNum } from './../helper';


/**
 *
 * 创建修饰层
 * @param {Array} modify
 * @returns
 */
function renderModify(modify) {

	if (!modify || !Array.isArray(modify)) {
		return '';
	}

	let modifyDom = '';
	for (let index = 0; index < modify.length; index++) {
		const element = modify[index];
		modifyDom += `<div class="${s.modify}" style="${inlineStyle(element)}">&nbsp;</div>`;
	}

	return modifyDom;
}

/**
 *
 * 创建游戏主体
 * @export
 * @param { Object } style 卡牌皮肤
 * @param { Array } prizes 奖项
 * @returns
 */
export function renderGame(style, prizes, id) {
	const { wrap, modify, prize, gameImg, prizeAlias, activated, lotteryButton } = style;

	const gameImgStyle = inlineStyle(gameImg);
	const prizeAliasStyle = inlineStyle(prizeAlias);
	const prizeStyle = inlineStyle(prize);
	const lotteryButtonStyle = inlineStyle(lotteryButton);
	const wrapStyle = inlineStyle(wrap);
	const activatedStyle = inlineStyle(activated);

	let sideLength = getFullNum((prizes.length - 4) / 4 + 2);
	let step = getFullNum(100 / sideLength);
	let maxRate = getFullNum((sideLength - 1) * step);
	const loatingThreshold = 0.3;
	let X = 0,
		Y = 0,
		dom = "",
		stepGrown = 1;

	for (let index = 0; index < prizes.length; index++) {
		const element = prizes[index];
		dom = `${dom}<div class="${s.prizeItem}" style="width:${step}%; height:${step}%; left: ${X}%; top: ${Y}%"><div class="${s.prize}" ${prizeStyle && `style="${prizeStyle}"`}>
			<div class="${s.selected}">
				<div ${activatedStyle && `style="${activatedStyle}"`}> </div>
			</div>
			<img class="${s.gameimg}" ${gameImgStyle && `style="${gameImgStyle}"`} src="${element.gameImg}" />
			<div class="${s.prizealias}" ${prizeAliasStyle && `style="${prizeAliasStyle}"`}>${element.prizeAlias}</div>
		</div></div>`;

		if (stepGrown === 1) {
			X = X + step;
			if (X >= maxRate + loatingThreshold) {
				X = maxRate;
				Y = 0;
				stepGrown = 2;
			}
		}

		if (stepGrown === 2) {
			Y = Y + step;
			if (Y >= maxRate + loatingThreshold) {
				X = maxRate;
				Y = 0;
				stepGrown = 3;
			}
		}

		if (stepGrown === 3) {
			Y = maxRate;
			X = X - step;
			if (X <= 0 - loatingThreshold) {
				X = 0;
				Y = maxRate;
				stepGrown = 4;
			}
		}

		if (stepGrown === 4) {
			Y = Y - step;
			if (Y === step) {
				stepGrown = 1;
			}
		}
	}

	return `${modify.length > 0 ? `<div class="${s.modifywrap}">${renderModify(modify)}</div>` : ''} 
	<div class="${s.wrap}" ${wrapStyle ? `style="${wrapStyle}"` : ''}>
	<div id="${id}" class="${s.lottery}">
		${dom}
	</div>
	<div class="${s.lotterybutton}" ><div class="${s.button}" ${lotteryButtonStyle ? `style="${lotteryButtonStyle}"` : ''}>&nbsp;</div></div>
	</div>`;
}