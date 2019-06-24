import { ResultModal, AddressModal, Loading, tools, htmlFactory } from '@byhealth/walle';
import s from './template/game.scss';
import { getGameDataLength, supplementingData } from './helper';
import { renderGame } from './template';
const { dormancyFor, isObject } = tools;
const { createDom, removeDom } = htmlFactory;

const stamp = (new Date()).getTime();


/**
 *
 * 核心转盘游戏模块
 * @class Game
 */
class Game {
	/**
	 * Creates an instance of Game.
	 * config = {...}
	 *   targetId GameId 默认game-target-时间戳+100以内随机数
	 *   parentId Game挂载Id
	 *   style = { ... }
	 *     GameTheme 游戏皮肤
	 *     SuccessModalTheme 成功弹窗皮肤
	 *	   AddressModalTheme 地址填写皮肤
	 *     LoadingTheme loading皮肤
	 *   start 启动抽奖方法 必填
	 *   saveAddress 保存收货人地址方法 必填
	 *   prizes 奖品参数
	 *   playerPhone 参与人电话
	 *   checkVerificationCode 验证参与人电话
	 *   receiverInfo 默认收货人信息
	 *   cardIdRequest 要求验证身份证  1 隐藏身份证，2 验证身份证，3 身份证为空时不验证有填写时验证，4 不验证身份证
	 *   onCancel 取消时的回调（取消中奖结果或取消填写地址）
	 *   onEnsure 确定时的回调（确定或完成填写地址后）
	 *   failedModalTitle 未中奖弹窗标题
	 *   submitFailedText 未中奖按钮文字
	 *   successModalTitle 中奖弹窗文字
	 *   submitSuccessText 中奖按钮文字
	 *   submitAddressText 中奖保存地址按钮文字
	 * 	 emBase {Number} em基准像素
	 *   loading = { ... } 设置
	 *      size: 20, // 尺寸大小 默认20
     *      length: 5, // 由几个点（vertices）组成默认12个
     *      cycle: 0.5, // 旋转一周的周期时间，单位s
	 * @param {Object} config
	 * @memberof Game
	 */
	/**
	 * 单条游戏奖品数据结构
	 * prize = {
     *   "prizeId": 1, // 奖品id
     *   "prizeType": 1, // 奖品类型 0 未中奖, 1 实物, 2 虚拟
     *   "receiveType": 1, // 领取方式。1：默认；2：填写地址；3：链接类；4：虚拟卡
     *   "prizeAlias": "巴西绿蜂胶", // 奖品别名
     *   "prizeName": "蜂胶软胶囊彩盒装（60粒，巴西绿蜂胶）", // 奖品名称
     *   "awardMsg": null, // 中奖提示信息
     *   "gameImg": "url/images/card1.png", // 游戏图片
     *   "prizeImg": "url/images/prize1.jpg", // 奖品图片
     *   "memo": "奖品的备注说明！" // 奖品备注
     * }
	 */
	constructor(config) {
		const {
			targetId, parentId, style,
			outerFrameId,
			start, saveAddress,
			prizes, playerPhone, receiverInfo,
			cardIdRequest, checkVerificationCode,
			onCancel, onEnsure,
			failedModalTitle, successModalTitle,
			submitSuccessText, submitAddressText, submitFailedText,
			emBase,
			loading
		} = config;
		const { GameTheme, SuccessModalTheme, FailedModalTheme, AddressModalTheme, MessageTheme, LoadingTheme } = style;
		// 历史位置
		this.historyPrizeInd = 0;
		// 缓冲阈值
		this.buffer = 5;
		this.Game = document.getElementById('target');
		this.GameTheme = GameTheme;
		this.targetId = targetId || `game-target-${stamp}${window.Math.floor(window.Math.random() * 100)}`;
		this.parentId = parentId;
		this.prizesLength = getGameDataLength(prizes.length);
		this.prizes = supplementingData(prizes, this.prizesLength);
		this.lotteryDrawing = false;
		this.emBase = emBase || null;

		this.loadingSet = isObject(loading) ? loading : {};

		this.SuccessModal =
			new ResultModal({
				outerFrameId,
				style: SuccessModalTheme,
				modalTitle: successModalTitle,
				// 重制游戏时嫁接onCancel方法
				onCancel: this.onCancel(onCancel),
				submitText: submitSuccessText,
				onEnsure,
				submitAddressText
			});

		this.FailedModal =
			new ResultModal({
				outerFrameId,
				style: FailedModalTheme,
				submitText: submitFailedText,
				modalTitle: failedModalTitle,
				// 重制游戏时this.onCancel嫁接onCancel方法
				onCancel: this.onCancel(onCancel)
			});

		this.AddressModal = new AddressModal({ AddressModalTheme, outerFrameId, MessageTheme, playerPhone, receiverInfo, cardIdRequest, checkVerificationCode });
		const data = { style: LoadingTheme, parentId: outerFrameId, ...this.loadingSet };
		this.Loading = new Loading(data);
		this.start = start || function () { throw '无抽奖方法'; };
		// 重制游戏时this.onSaveAddress嫁接saveAddress方法
		this.saveAddress = this.onSaveAddress(saveAddress);
		this.oldDge = 0;
		this.initTheme();
	}

	/**
	 * 放弃中奖结果时重置游戏
	 * @param { Function } cancel 承接放弃中奖结果方法
	 * @memberof Game
	 */
	onCancel = (cancel) => () => {
		cancel();
	}

	/**
	 * 保存地址成功后重置游戏
	 * @param { Function } saveAddress 承接保存地址方法
	 * @memberof Game
	 */
	onSaveAddress = (saveAddress) => (data) => {
		if (saveAddress && typeof saveAddress === 'function') {
			return saveAddress(data);
		}
		return () => {
			throw '无保存地址方法';
		};
	}

	/**
	 * 修改和保存地址
	 * @param { Function } callback 承接保存地
	 * @memberof Game
	 */
	handleSaveAddress = (callback) => {
		this.AddressModal.showModal(this.saveAddress, callback);
	}

	/**
	 *
	 * 销毁Game
	 * @memberof Game
	 */
	distory = () => {
		this.Loading.reset();
		const mobileSelect = document.querySelector('.mobileSelect');
		mobileSelect && mobileSelect.parentNode.removeChild(mobileSelect);
		Promise.all([
			removeDom(this.targetId),
			removeDom(this.Loading.id),
			removeDom(this.SuccessModal.state.id),
			removeDom(this.FailedModal.state.id),
			removeDom(this.AddressModal.state.id),
			removeDom(this.AddressModal.state.id)
		])
			.then()
			.catch(err => console.log(err));
	}

	/**
	 *
	 * 初始化模板
	 * @memberof Game
	 */
	initTheme = () => {
		return createDom(
			renderGame(
				this.GameTheme,
				this.prizes,
				`${this.targetId}_items`
			),
			this.targetId,
			this.parentId,
			this.emBase
		)
			.then(() => {
				const target = document.getElementById(this.targetId);
				target.classList.add(s.target);
				return dormancyFor(50);
			})
			.then(() => {
				const target = document.getElementById(this.targetId);
				const lotterybtn = target.querySelector(`.${s.lotterybutton}`);
				lotterybtn.onclick = e => {
					return this.lottery(e);
				};
			});
	}

	/**
	 *
	 * 抽奖
	 * @param {Number} index 索引值
	 * @returns
	 * @memberof Game
	 */
	lottery = () => {
		if (this.lotteryDrawing) {
			return Promise.reject('当前正在抽奖！');
		}
		this.lotteryDrawing = true;
		Promise.resolve()
			.then(() => this.start())
			.then(res => {
				return Promise.resolve()
					// 处理抽奖过程
					.then(() => this.lotteryHistory())
					.then(() => this.startLottery(res))
					.then(() => dormancyFor(600))
					.then(() => Promise.resolve(res));
			})
			.then(res => {
				console.log('res', res);
				if (res.prizeType === 0) {
					return this.showFailedModal(res);
				}
				return this.showSuccessModal(res);
			})
			.catch(err => {
				this.lotteryDrawing = false;
				console.error(err);
			});
	}

	/**
	 *
	 * 开始抽奖
	 * @param {Object} prize 所获奖品
	 * @param {Number} time 旋转时间默认5秒
	 * @param {Number} round 旋转圈数默认6圈
	 * @returns
	 * @memberof Game
	 */
	// 渲染遗留数据
	lotteryHistory = (time) => {
		let itemsDomList = document.getElementById(`${this.targetId}_items`).children;
		let surplus = this.historyPrizeInd;
		let settime = time || 100;
		return new Promise(resolve => {
			if (surplus <= 0) {
				return resolve();
			}
			let timer = null;
			const that = this;
			(function run() {
				for (let index = 0; index < that.prizesLength; index++) {
					const element = itemsDomList[index];
					element.classList.remove(s.active);
				}
				itemsDomList[surplus].classList.add(s.active);
				surplus++;
				window.clearTimeout(timer);
				timer = setTimeout(() => {
					if (surplus < that.prizesLength) {
						run();
					} else {
						resolve();
					}
				}, settime + that.buffer * 50);
			})();
		});
	}
	/**
	 *
	 * 开始抽奖
	 * @param {Object} prize 所获奖品
	 * @param {Number} time 每个奖项停留时间
	 * @param {Number} round 旋转圈数默认6圈
	 * @returns
	 * @memberof Game
	 */
	startLottery = (prize, time, round) => {
		const { prizeId } = prize || {};
		return new Promise((resolve, reject) => {
			if (!prizeId) {
				this.lotteryDrawing = false;
				return reject('抽奖失败！奖品ID不存在。');
			}
			let getPrizeInd = 0;
			for (let index = 0; index < this.prizes.length; index++) {
				const element = this.prizes[index];
				if (element.prizeId === prize.prizeId) {
					getPrizeInd = index;
					break;
				}
			}

			let itemsDomList = document.getElementById(`${this.targetId}_items`).children;

			let settime = time || 100;

			let timer = null;
			// 指针位置
			let pointerLocation = 0;
			// 默认几圈
			let defaultCircle = round || 3;
			// 算出路程
			let pathLength = defaultCircle * this.prizesLength + getPrizeInd;
			const that = this;
			(function fun() {
				for (let index = 0; index < itemsDomList.length; index++) {
					const element = itemsDomList[index];
					element.classList.remove(s.active);
				}
				itemsDomList[pointerLocation % that.prizesLength].classList.add(s.active);
				window.clearTimeout(timer);
				timer = setTimeout(() => {
					pointerLocation++;
					if (pointerLocation < 10 && that.buffer !== 0) {
						that.buffer--;
					}
					if (pointerLocation > pathLength - 10) {
						that.buffer++;
					}
					if (pointerLocation <= pathLength) {
						fun();
					} else {
						pointerLocation = 0;
						that.buffer = 0;
						resolve(prize);
						that.historyPrizeInd = getPrizeInd;
						// console.log(`中奖${prize}`, `位置${getPrizeInd}`);
						that.lotteryDrawing = false;
					}
				}, settime + that.buffer * 50);
			})();
		});
	}

	/**
	 *
	 * 显示中奖信息
	 * 实物奖品时填写收货地址
	 * @param {Object} prize
	 * @returns
	 * @memberof Game
	 */
	showSuccessModal = (prize) => {
		return this.SuccessModal.showModal(prize)
			.then(prize => {
				// 1：默认；2：填写地址；3：链接类；4：虚拟卡
				if (prize.receiveType === 2) {
					this.AddressModal.showModal(this.saveAddress, () => {
						this.showSuccessModal(prize);
					});
				} else {
					Promise.resolve()
						.then(() => dormancyFor(800));
				}
			});
	}

	/**
	 *
	 * 显示失败提示
	 * @param {Object} prize
	 * @returns
	 * @memberof Game
	 */
	showFailedModal(prize) {
		return this.FailedModal.showModal(prize);
	}

}


export default Game;