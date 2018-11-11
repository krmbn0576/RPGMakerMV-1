/*=============================================================================
 PhantomEvent.js
----------------------------------------------------------------------------
 (C)2018 Triacontane
 This software is released under the MIT License.
 http://opensource.org/licenses/mit-license.php
----------------------------------------------------------------------------
 Version
 1.1.0 2018/11/11 最小不透明度を設定できる機能を追加
 1.0.0 2018/11/11 初版
----------------------------------------------------------------------------
 [Blog]   : https://triacontane.blogspot.jp/
 [Twitter]: https://twitter.com/triacontane/
 [GitHub] : https://github.com/triacontane/
=============================================================================*/

/*:
 * @plugindesc PhantomEventPlugin
 * @author triacontane
 *
 * @param invisibleDistance
 * @desc 指定範囲を超えてから完全に見えなくなるまでのマス数です。
 * @default 3
 * @type number
 * @min 1
 *
 * @param visibleSelfSwitch
 * @desc 指定したセルフスイッチがONのとき、イベントの不可視化が無効になります。
 * @default
 * @type select
 * @option none
 * @value
 * @option A
 * @option B
 * @option C
 * @option D
 *
 * @param minimumOpacity
 * @desc どれだけ離れても最低限、以下の不透明度を保ちます。(0-255)
 * @default 0
 * @type number
 * @min 0
 * @max 255
 *
 * @param commandPrefix
 * @desc 他のプラグインとメモ欄もしくはプラグインコマンドの名称が被ったときに指定する接頭辞です。通常は指定不要です。
 * @default
 *
 * @help PhantomEvent.js
 *
 * 指定範囲より遠くにあるイベントの透明度を徐々に下げて最終的に不可視にします。
 * 画面表示以外は特に変化はありません。
 *
 * イベントのメモ欄に以下の通り入力してください。
 * <可視距離:3>        // 3マス以上離れると見えなくなります。
 * <VisibleDistance:3> // 同上
 *　
 * このプラグインにはプラグインコマンドはありません。
 *
 * This plugin is released under the MIT License.
 */
/*:ja
 * @plugindesc ファントムイベントプラグイン
 * @author トリアコンタン
 *
 * @param invisibleDistance
 * @text 不可視距離
 * @desc 指定範囲を超えてから完全に見えなくなるまでのマス数です。
 * @default 3
 * @type number
 * @min 1
 *
 * @param visibleSelfSwitch
 * @text 可視化セルフスイッチ
 * @desc 指定したセルフスイッチがONのとき、イベントの不可視化が無効になります。
 * @default
 * @type select
 * @option none
 * @value
 * @option A
 * @option B
 * @option C
 * @option D
 *
 * @param minimumOpacity
 * @text 最小不透明度
 * @desc どれだけ離れても最低限、以下の不透明度を保ちます。(0-255)
 * @default 0
 * @type number
 * @min 0
 * @max 255
 *
 * @param commandPrefix
 * @text メモ欄接頭辞
 * @desc 他のプラグインとメモ欄もしくはプラグインコマンドの名称が被ったときに指定する接頭辞です。通常は指定不要です。
 * @default
 *
 * @help PhantomEvent.js
 *
 * 指定範囲より遠くにあるイベントの透明度を徐々に下げて最終的に不可視にします。
 * 画面表示以外は特に変化はありません。
 *
 * イベントのメモ欄に以下の通り入力してください。
 * <可視距離:3>        // 3マス以上離れると見えなくなります。
 * <VisibleDistance:3> // 同上
 *　
 * このプラグインにはプラグインコマンドはありません。
 *
 * 利用規約：
 *  作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *  についても制限はありません。
 *  このプラグインはもうあなたのものです。
 */

(function() {
    'use strict';

    /**
     * Get database meta information.
     * @param object Database item
     * @param name Meta name
     * @returns {String} meta value
     */
    var getMetaValue = function(object, name) {
        var tagName = param.commandPrefix + name;
        return object.meta.hasOwnProperty(tagName) ? convertEscapeCharacters(object.meta[tagName]) : null;
    };

    /**
     * Get database meta information.(for multi language)
     * @param object Database item
     * @param names Meta name array (for multi language)
     * @returns {String} meta value
     */
    var getMetaValues = function(object, names) {
        var metaValue;
        names.some(function(name) {
            metaValue = getMetaValue(object, name);
            return metaValue !== null;
        });
        return metaValue;
    };

    /**
     * Convert escape characters.(require any window object)
     * @param text Target text
     * @returns {String} Converted text
     */
    var convertEscapeCharacters = function(text) {
        var windowLayer = SceneManager._scene._windowLayer;
        return windowLayer ? windowLayer.children[0].convertEscapeCharacters(text.toString()) : text;
    };

    /**
     * Create plugin parameter. param[paramName] ex. param.commandPrefix
     * @param pluginName plugin name(EncounterSwitchConditions)
     * @returns {Object} Created parameter
     */
    var createPluginParameter = function(pluginName) {
        var paramReplacer = function(key, value) {
            if (value === 'null') {
                return value;
            }
            if (value[0] === '"' && value[value.length - 1] === '"') {
                return value;
            }
            try {
                return JSON.parse(value);
            } catch (e) {
                return value;
            }
        };
        var parameter     = JSON.parse(JSON.stringify(PluginManager.parameters(pluginName), paramReplacer));
        PluginManager.setParameters(pluginName, parameter);
        return parameter;
    };
    var param = createPluginParameter('PhantomEvent');

    /**
     * Game_Map
     * ピクセル単位での距離を取得します。
     */
    Game_Map.prototype.realDistance = function(x1, y1, x2, y2) {
        return Math.abs(this.realDeltaX(x1, x2)) + Math.abs(this.realDeltaY(y1, y2));
    };

    Game_Map.prototype.realDeltaX = function(x1, x2) {
        var result = (x1 - x2) * this.tileWidth();
        var realWidth = this.width() * this.tileWidth();
        if (this.isLoopHorizontal() && Math.abs(result) > realWidth / 2) {
            if (result < 0) {
                result += realWidth;
            } else {
                result -= realWidth;
            }
        }
        return result;
    };

    Game_Map.prototype.realDeltaY = function(y1, y2) {
        var result = (y1 - y2) * this.tileHeight();
        var realHeight = this.height() * this.tileHeight();
        if (this.isLoopVertical() && Math.abs(result) > realHeight / 2) {
            if (result < 0) {
                result += realHeight;
            } else {
                result -= realHeight;
            }
        }
        return result;
    };

    /**
     * Game_CharacterBase
     * 不透明度に不可視情報を反映させます。
     */
    var _Game_CharacterBase_opacity = Game_CharacterBase.prototype.opacity;
    Game_CharacterBase.prototype.opacity = function() {
        var opacity = _Game_CharacterBase_opacity.apply(this, arguments);
        var phantomOpacity = this.getPhantomOpacity();
        return phantomOpacity !== 1 ? Math.max(Math.floor(opacity * this.getPhantomOpacity()), param.minimumOpacity) : opacity;
    };

    Game_CharacterBase.prototype.getPhantomOpacity = function() {
        return 1;
    };

    /**
     * Game_Event
     * イベントの不可視距離を取得します。
     */
    var _Game_Event_initialize = Game_Event.prototype.initialize;
    Game_Event.prototype.initialize = function() {
        _Game_Event_initialize.apply(this, arguments);
        this._visibleDistance = parseInt(getMetaValues(this.event(), ['可視距離', 'VisibleDistance'])) * $gameMap.tileWidth() || 0;
    };

    Game_Event.prototype.getDistanceFromPlayer = function() {
        return $gameMap.realDistance(this._realX, this._realY, $gamePlayer._realX, $gamePlayer._realY);
    };

    Game_Event.prototype.isPhantom = function() {
        return this._visibleDistance > 0 && !(param.visibleSelfSwitch && this.isValidVisibleSelfSwitch());
    };

    Game_Event.prototype.isValidVisibleSelfSwitch = function(key) {
        return $gameSelfSwitches.value([$gameMap.mapId(), this.eventId(), param.visibleSelfSwitch]);
    };

    Game_Event.prototype.getPhantomOpacity = function() {
        if (!this.isPhantom()) {
            return 1;
        }
        var d = this.getDistanceFromPlayer() - this._visibleDistance;
        return Math.min(1 - d / ((param.invisibleDistance || 1) * $gameMap.tileWidth()), 1);
    };
})();