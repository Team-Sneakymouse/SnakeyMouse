import { Spritesheet } from './spritesheet';
import { Background } from './background';
import engine from 'engine';
import { CLIENT_STATES, CONTROL_TYPES } from '../clientState';
import * as playerRenderer from './playerRenderer';
import * as spriteRenderer from './spriteRenderer';
const { utils, GLOBALS } = engine;
let layers = [];

export const init = (_state) => {
  const s = _state;
  const sg = s.game;
  const si = s.image;

  //load assets
  Object.entries(si.tilesheetAssets).forEach(([sheetName, tilesheet]) => {
    si.tilesheets[sheetName] = new Spritesheet(tilesheet[0], tilesheet[1]);
    sg.loading.push(si.tilesheets[sheetName].load(s));
  });
  Object.entries(si.spritesheetAssets).forEach(([sheetName, spritesheet]) => {
    si.spritesheets[sheetName] = new Spritesheet(spritesheet[0], spritesheet[1]);
    sg.loading.push(si.spritesheets[sheetName].load(s));
  });
  Object.entries(si.backgroundAssets).forEach(([bgName, bgFile]) => {
    si.backgrounds[bgName] = new Background(bgName, bgFile[0], bgFile[1]);
    sg.loading.push(si.backgrounds[bgName].load(s));
  })

  si.tutorialImg = new Background('tutorialImg', si.tutorialImg[0], si.tutorialImg[1]);
  sg.loading.push(si.tutorialImg.load());
}

export const draw = (_state) => {
  const s = _state;
  const sg = s.game;
  const sv = s.view;
  const sp = s.physics;
  const sl = s.level;
  //draw background
  const backs = sl.activeBackgrounds;
  backs.forEach(back => {
    const dx = sv.active.xMin() * back.parallaxSpeed[0];
    const dy = sv.active.yMin() * back.parallaxSpeed[1];
    const dHeight = sl.activeLevelData.guWidth * sg.gu;
    const dWidth = dHeight * back.whRatio;
    s.ctx.drawImage(back.image, dx, dy, dWidth, dHeight);
  })
  //draw tilesheets
  for (let l = 0; l < layers.length; l++) {
    //Loop through the data
    for (let i = 0; i < layers[l].data.length; i++) {
      let x = i % layers[l].width;;
      let y = Math.floor(i / layers[l].width);
      x *= sg.gu;
      y *= sg.gu;
      //Tile source bounds
      let tileID = layers[l].data[i];
      if (tileID == 0) {
        continue;
      }
      let sheet = getSheet(tileID);
      if (sheet == undefined) {
        continue;
      }
      let tile = sheet.tile(tileID);

      //Destination bounds
      let dWidth = sg.gu;
      let dHeight = sg.gu;

      if (x > sv.active.xMax() || y > sv.active.yMax() || x + dWidth < sv.active.xMin() || y + dHeight < sv.active.yMin()) {
        continue;
      }

      let destPos = sv.active.getObjectRelativePosition(s, {
        x: x,
        y: y
      }, false);

      c.drawImage(
        sheet.img,
        tile.x,
        tile.y,
        tile.width,
        tile.height,
        Math.round(destPos.x),
        Math.round(destPos.y),
        dWidth,
        dHeight
      );
    }
  }
  //draw game objects
  for (const go in sp.gameObjects) {
    sp.gameObjects[go].draw(s);
  }
}

export const drawGUI = (_state) => {
  const sg = _state.game;
  if (sg.clientState === CLIENT_STATES.PLAYING || sg.clientState === CLIENT_STATES.PAUSED) {
    switch (sg.gameState) {
      case CLIENT_STATES.GAME_WAITING_FOR_PLAYERS:
        drawWaitingForPlayersGUI(_state);
        break;
      case CLIENT_STATES.GAME_STARTING_SOON:
        drawStartingSoonGUI(_state);
        break;
      case CLIENT_STATES.GAME_OVER:
        drawGameOverGUI(_state);
        break;
      case CLIENT_STATES.GAME_RESETTING:
        drawResetGUI(_state);
        break;
      case CLIENT_STATES.GAME_PLAYING:
      default:
        drawPlayingGUI(_state);
        break;
    }

    if (sg.controlType === CONTROL_TYPES.TOUCH) {
      sg.touchButtons.forEach(touchButton => touchButton.updateAndDraw(_state))
    }
  }
}

export const drawWaitingForPlayersGUI = (_state) => {
  const s = _state;
  const sg = s.game;
  const vpUnit = Math.min(s.viewport.vw, s.viewport.vh);
  drawTextOutline(
    s,
    "Waiting for Players (min 2)",
    s.viewport.width / 2,
    4 * vpUnit,
    `${4 * vpUnit}px Arial`,
    'rgb(255, 255, 255)',
    'rgb(50, 50, 50)',
    1
  );
  Object.values(sg.players).forEach((player, i) => {
    if (i > 20) return;
    drawTextOutline(s, "Sneks in a Lobby", 18 * vpUnit, 4 * vpUnit, `${4 * vpUnit}px Arial`, 'rgb(255, 255, 255)', 'rgb(50, 50, 50)', 1)
    drawTextOutline(s, player.name, 3 * vpUnit, 9 * vpUnit + i * 3 * vpUnit, `${3 * vpUnit}px Arial`, 'rgb(255, 255, 255)', 'rgb(50, 50, 50)', 0.5, 'left');
  });
}

export const drawStartingSoonGUI = (_state) => {
  const s = _state;
  const sg = s.game;
  const vpUnit = Math.min(s.viewport.vw, s.viewport.vh);
  drawTextOutline(
    s,
    "Starting Soon (unless people leave)",
    s.viewport.width / 2,
    4 * vpUnit,
    `${4 * vpUnit}px Arial`,
    'rgb(255, 255, 255)',
    'rgb(50, 50, 50)',
    1
  );
  drawProgressBar(
    s,
    s.viewport.width / 3,
    7 * vpUnit,
    s.viewport.width / 3,
    1.5 * vpUnit,
    'rgba(255, 255, 255, 0.5)',
    '#7D5BA6',
    sg.gameStateTimer,
    0,
    GLOBALS.startTimerLength
  );
}

export const drawGameOverGUI = (_state) => {
  const s = _state;
  const sg = s.game;
  const vpUnit = Math.min(s.viewport.vw, s.viewport.vh);
  let c = s.ctx;
  c.fillStyle = "rgba(0, 0, 0, 0.5)";
  c.fillRect(0, 0, s.viewport.width, s.viewport.height);
  drawTextOutline(
    s,
    "Game Over",
    s.viewport.width / 2,
    4 * vpUnit,
    `${5 * vpUnit}px Arial`,
    'rgb(255, 255, 255)',
    'rgb(50, 50, 50)',
    1
  );
  drawProgressBar(
    s,
    s.viewport.width / 3,
    7 * vpUnit,
    s.viewport.width / 3,
    1.5 * vpUnit,
    'rgba(255, 255, 255, 0.5)',
    '#D81159',
    sg.gameStateTimer,
    GLOBALS.gameEndTimerLength,
    0
  );
  drawTextOutline(
    s,
    "Most Dangerous Noodle:",
    s.viewport.width / 2,
    s.viewport.height / 2 - 4 * vpUnit,
    `${6 * vpUnit}px Arial`,
    'rgb(255, 255, 255)',
    'rgb(50, 50, 50)',
    2
  );
  drawTextOutline(
    s,
    `${sg.scoreboard?.[0]?.[1]} with ${sg.scoreboard?.[0]?.[2]} points!`,
    s.viewport.width / 2,
    s.viewport.height / 2 + 4 * vpUnit,
    `${7 * vpUnit}px Arial`,
    'rgb(255, 255, 255)',
    'rgb(50, 50, 50)',
    2
  );
}

export const drawResetGUI = (_state) => {
  const vpUnit = Math.min(_state.viewport.vw, _state.viewport.vh);
  drawTextOutline(
    _state,
    "Reseting...",
    _state.viewport.width / 2,
    4 * vpUnit,
    `${4 * vpUnit}px Arial`,
    'rgb(255, 255, 255)',
    'rgb(50, 50, 50)',
    1
  );
}

export const drawPlayingGUI = (_state) => {
  const s = _state;
  const sg = s.game;
  const vpUnit = Math.min(s.viewport.vw, s.viewport.vh);
  drawScoreboard(s, 3 * vpUnit, 6 * vpUnit);
  drawTextOutline(
    s,
    "Time Left",
    s.viewport.width / 2,
    4 * vpUnit,
    `${4 * vpUnit}px Arial`,
    'rgb(255, 255, 255)',
    'rgb(50, 50, 50)',
    1
  );
  drawProgressBar(
    s,
    s.viewport.width / 3,
    6 * vpUnit,
    s.viewport.width / 3,
    1.5 * vpUnit,
    'rgba(255, 255, 255, 0.5)',
    '#55D6BE',
    sg.gameStateTimer,
    GLOBALS.roundTimerLength,
    0
  );
}

export const drawScoreboard = (_state, x, y) => {
  const s = _state;
  const sg = s.game;
  const vpUnit = Math.min(s.viewport.vw, s.viewport.vh);
  const scoreboard = sg.scoreboard;
  let c = s.ctx;
  c.save();
  scoreboard.forEach((playerScore, i) => {
    if (i > 9) return;
    drawTextOutline(s, "Sneakiest Sneks", x + 15 * vpUnit, y - 1.5 * vpUnit, `${4 * vpUnit}px Arial`, 'rgb(255, 255, 255)', 'rgb(50, 50, 50)', 1)
    drawTextOutline(s, playerScore[2], x, y + 3 * vpUnit + i * 3 * vpUnit, `${3 * vpUnit}px Arial`, 'rgb(255, 255, 255)', 'rgb(50, 50, 50)', 0.5, 'left');
    drawTextOutline(s, playerScore[1], x + 9 * vpUnit, y + 3 * vpUnit + i * 3 * vpUnit, `${3 * vpUnit}px Arial`, 'rgb(255, 255, 255)', 'rgb(50, 50, 50)', 0.5, 'left');
  });
  c.restore();
}

export const createTileLayer = (layerData) => {
  layers.push(layerData);
}

export const getSheet = (_state, tileID) => {
  const s = _state;
  const si = s.image;
  for (const sid in si.tilesheets) {
    if (tileID - si.tilesheets[sid].tileStart < si.tilesheets[sid].tileCount) {
      return si.tilesheets[sid];
    }
  }
  return undefined;
}

export const drawText = (_state, string, x, y, css, color, textAlign = "center", textBaseline = "middle") => {
  let c = _state.ctx;
  c.save();
  c.font = css;
  c.fillStyle = color;
  c.textAlign = textAlign;
  c.textBaseline = textBaseline;
  c.fillText(string, x, y);
  c.restore();
}

export const drawShadowText = (
  _state,
  string,
  x,
  y,
  css,
  shadowColor,
  textColor,
  offsetX = 5,
  offsetY = 5,
  textAlign = "center",
  textBaseline = "middle"
) => {
  //Draw shadow
  drawText(_state, string, x + offsetX, y + offsetY, css, shadowColor, textAlign, textBaseline);
  //Draw text
  drawText(_state, string, x, y, css, textColor, textAlign, textBaseline);
}

export const drawTextOutline = (
  _state,
  string,
  x,
  y,
  css,
  color,
  outlineColor,
  lineWidth = 3,
  textAlign = "center",
  textBaseline = "middle"
) => {
  let c = _state.ctx;
  c.save();
  c.font = css;
  c.fillStyle = color;
  c.strokeStyle = outlineColor;
  c.lineWidth = lineWidth;
  c.textAlign = textAlign;
  c.textBaseline = textBaseline;
  c.fillText(string, x, y);
  c.strokeText(string, x, y);
  c.restore();
}

export const drawProgressBar = (_state, x, y, width, height, backColor, frontColor, val, minVal, maxVal) => {
  let c = _state.ctx;
  c.save();
  c.fillStyle = backColor;
  c.fillRect(x, y, width, height);
  c.fillStyle = frontColor;
  let frontWidth = utils.map(val, minVal, maxVal, 0, width);
  c.fillRect(x, y, frontWidth, height);
  c.restore();
}

export const randomPalletteColor = () => {
  const allColors = [
    '#55D6BE',
    '#FFFD98',
    '#A833B9',
    '#AFD2E9',
    '#ED254E',
    '#F18805',
    '#7D5BA6',
    '#FC6471',
    '#D81159',
    '#606C38'
  ];
  return allColors[utils.randomInt(0, allColors.length - 1)]
}

export const allPlayerSpriteNames = [
  ["cheetohPlayer", "Cheetoh"],
  ["dangerRatPlayer", "Danger Rat"],
  ["dangerRatColonyPlayer", "Oops All Rats"],
  ["jimmyPlayer", "Jimmy"],
  ["koboldPlayer", "Kobold"],
  ["monicaPlayer", "Monica"],
  ["snakeyMousePlayer", "Snakey Mouse"],
  ["vampireMonicaPlayer", "Vampire Monica"],
  ["vampireMousePlayer", "Vampire Mouse"]
];
export const randomPlayerSprite = () => {
  return allPlayerSpriteNames[utils.randomInt(0, allPlayerSpriteNames.length - 1)][0];
}
