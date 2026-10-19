import angular from 'angular';

import { missingBrowserFeatures } from './shims.js';
import { MainCtrl } from './mainctrl.js';
import { analyser } from './analyser.js';
import { fileStorage } from './file.js';
import { history } from './history.js';
import { context, Player } from './player.js';
import { localStorage } from './storage.js';
import { synthFactory } from './synthfactory.js';
import { customParam, floatParam, booleanParam, waveformButton, linkbox } from './ui.js';
import { canvasManager, waveshape, drawAmplitude, drawFrequency } from './waveshape.js';
import { installBridge } from './devstudio-bridge.js';   // devstudio 포팅(R-J25) — 편집 명령 다리 window.__sfx

import '../css/index.scss';

var jfxrApp = angular.module('jfxrApp', []);

jfxrApp.controller('MainCtrl', MainCtrl);

jfxrApp.directive('analyser', analyser);
jfxrApp.directive('customParam', customParam);
jfxrApp.directive('floatParam', floatParam);
jfxrApp.directive('booleanParam', booleanParam);
jfxrApp.directive('waveformButton', waveformButton);
jfxrApp.directive('linkbox', linkbox);
jfxrApp.directive('canvasManager', canvasManager);
jfxrApp.directive('waveshape', waveshape);
jfxrApp.directive('drawAmplitude', drawAmplitude);
jfxrApp.directive('drawFrequency', drawFrequency);

jfxrApp.service('context', context);
jfxrApp.service('fileStorage', fileStorage);
jfxrApp.service('history', history);
jfxrApp.service('Player', Player);
jfxrApp.service('localStorage', localStorage);
jfxrApp.service('synthFactory', synthFactory);

function init() {
  var panic = angular.element(document.getElementById('panic'));
  var missing = missingBrowserFeatures();
  if (missing.length > 0) {
    panic.html(
      'Unfortunately, jfxr cannot run in this browser because it lacks the following features: ' +
      missing.join(', ') + '. Try a recent Chrome or Firefox instead.');
    return;
  }
  panic.remove();

  angular.element(document).ready(function() {
    angular.bootstrap(document, ['jfxrApp']);
    installBridge(angular);
  });
}

init();
