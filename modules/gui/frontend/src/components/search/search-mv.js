/**
 * @author Mino Togna
 */
// var moment   = require( 'moment' )
var EventBus           = require('../event/event-bus')
var Events             = require('../event/events')
var Loader             = require('../loader/loader')
var View               = require('./search-v')
var Model              = require('./model/search-model')
var SearchRequestUtils = require('./search-request-utils')
var moment             = require('moment')

require('../scene-areas/scene-areas-mv')
require('../scenes-selection/scenes-selection-mv')
require('../search-retrieve/search-retrieve-mv')
require('../scene-area-mosaics/scene-area-mosaics-mv')

var show = function (e, type, params) {
  if (type == 'search') {
    View.init()
  }
  if (!(params && params.source === 'app-section'))
    View.showList()
}

var requestSceneAreas = function (e, state) {
  var data     = {}
  data.dataSet = state.sensorGroup
  SearchRequestUtils.addAoiRequestParameter(state, data)
  
  var params = {
    url         : '/api/data/sceneareas'
    , data      : data
    , beforeSend: function () {
      Loader.show()
    }
    , success   : function (response) {
      state.sceneAreas = {}
      $.each(response, function (i, sceneArea) {
        state.sceneAreas[sceneArea.sceneAreaId] = {polygon: sceneArea.polygon, selection: []}
      })
      state.mosaicPreviewBand = null
      
      EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, state, {resetSceneAreas: true})
      EventBus.dispatch(Events.SECTION.REDUCE)
      Loader.hide({delay: 300})
    }
  }
  EventBus.dispatch(Events.AJAX.POST, null, params)
  
}

EventBus.addEventListener(Events.SECTION.SHOW, show)
EventBus.addEventListener(Events.SECTION.SEARCH.REQUEST_SCENE_AREAS, requestSceneAreas)

// list actions
var loadList = function (e) {
  var params = {
    url    : '/processing-recipes',
    success: function (response) {
      EventBus.dispatch(Events.SECTION.SEARCH.STATE.LIST_CHANGE, null, response)
    }
  }
  EventBus.dispatch(Events.AJAX.GET, null, params)
}

var _loadMosaic = function (id, callback) {
  var params = {
    url         : '/processing-recipes/' + id
    , beforeSend: function () {
      Loader.show()
    }
    , success   : function (response) {
      Loader.hide({delay: 1000})
      
      var state = typeof response === 'string' ? JSON.parse(response) : response
      delete state['mosaic']
      
      setTimeout(function () {
        switch (state.type) {
          case Model.TYPES.MOSAIC:
            View.showMosaic()
            break
          case Model.TYPES.CLASSIFY:
            View.showClassification()
            break
          case Model.TYPES.CHANGE_DETECTION:
            View.showChangeDetection()
            break
        }
      }, 200)
      setTimeout(function () {
        callback(state)
      }, 600)
    }
  }
  EventBus.dispatch(Events.AJAX.GET, null, params)
}

var loadMosaic = function (e, id) {
  _loadMosaic(id, function (state) {
    EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, state, {resetSceneAreas: true, isNew: true})
    EventBus.dispatch(Events.SECTION.REDUCE)
    if (state.mosaicPreview && state.mosaicPreviewBand) {
      EventBus.dispatch(Events.SECTION.SEARCH_RETRIEVE.PREVIEW_MOSAIC, null, state)
    }
  })
}

var cloneMosaic = function (e, id) {
  _loadMosaic(id, function (state) {
    state.id   = guid()
    state.name = state.name + '-clone'
    EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, state, {
      resetSceneAreas: true,
      hideSceneAreas : true,
      isNew          : true
    })
  })
}

var deleteMosaic = function (e, id) {
  var params = {
    url         : '/processing-recipes/' + id
    , beforeSend: function () {
      Loader.show()
    }
    , success   : function (response) {
      Loader.hide({delay: 1000})
      
      EventBus.dispatch(Events.SECTION.SEARCH.STATE.LIST_CHANGE, null, response)
      
      if (Model.isActive(id)) {
        EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, null)
      }
    }
  }
  EventBus.dispatch(Events.AJAX.DELETE, null, params)
}

EventBus.addEventListener(Events.SECTION.SEARCH.STATE.LIST_LOAD, loadList)
EventBus.addEventListener(Events.SECTION.SEARCH.MOSAIC_LOAD, loadMosaic)
EventBus.addEventListener(Events.SECTION.SEARCH.MOSAIC_CLONE, cloneMosaic)
EventBus.addEventListener(Events.SECTION.SEARCH.MOSAIC_DELETE, deleteMosaic)

var guid = function () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4()
}

var showList = function () {
  View.showList()
}

// add mosaics
var addMosaic = function () {
  
  var getDefaultState = function () {
    var date         = moment(new Date())
    var defaultState = {
      id         : guid(),
      type       : Model.TYPES.MOSAIC,
      name       : 'mosaic-' + date.format('YYYY-MM-DD-HH:mm'),
      aoiCode    : null,
      aoiName    : null,
      sensorGroup: Model.getSensorGroups()[0],
      targetDate : date.format('YYYY-MM-DD'),
      
      sortWeight       : 0.5,
      sensors          : Object.keys(Model.getSensors(Model.getSensorGroups()[0])),
      offsetToTargetDay: 0,
      minScenes        : 1,
      maxScenes        : null,
      maskSnow         : true,
      brdfCorrect      : true
    }
    return defaultState
  }
  // View.showMosaic()
  EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, getDefaultState(), {isNew: true})
}

var addClassification = function () {
  
  var getDefaultState = function () {
    var date         = moment(new Date())
    var defaultState = {
      id                    : guid(),
      type                  : Model.TYPES.CLASSIFY,
      name                  : 'classification-' + date.format('YYYY-MM-DD-HH:mm'),
      inputRecipe           : null,
      fusionTableId         : null,
      fusionTableClassColumn: null,
      algorithm             : null
    }
    return defaultState
  }
  // View.showMosaic()
  EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, getDefaultState(), {isNew: true})
}

var fakeMosaic = function (state) {
  // faking mosaic preview
  var d = {
    targetDayOfYearWeight: 0.5,
    bands                : 'red, green, blue',
    dataSet              : 'LANDSAT',
    sceneIds             : 'LC81850322016191LGN01,LC81850322016223LGN01,LC81850322016175LGN01,LC81850332016223LGN01,LC81850332016191LGN01,LC81860322016214LGN01,LC81860322016230LGN01,LC81860322016182LGN01,LC81870312016205LGN01,LC81870312016189LGN01,LC81860312016214LGN01,LC81860312016182LGN01,LE71860312016206NSG00,LC81850312016191LGN01,LC81850312016223LGN01,LC81850312016239LGN01,LC81870302016205LGN01,LE71870302016213NSG00,LC81870302016189LGN01,LC81860302016214LGN01,LC81860302016230LGN01,LC81860302016182LGN01',
    countryIso           : 'ALB',
    targetDayOfYear      : 213,
    maskSnow             : true,
    brdfCorrect          : true
  }
  var p = {
    url         : '/api/data/mosaic/preview',
    data        : d
    , beforeSend: function () {
      Loader.show()
    }
    , success   : function (response) {
      state.mosaicPreview = true
      state.mosaic = {mapId: response.mapId, token: response.token}
      EventBus.dispatch(Events.SECTION.SEARCH_RETRIEVE.MOSAIC_LOADED, null, state.mosaic.mapId, state.mosaic.token)
      EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, state)
      
      EventBus.dispatch(Events.SECTION.REDUCE)
      
      Loader.hide({delay: 500})
    }
  }
  EventBus.dispatch(Events.AJAX.POST, null, p )
}

var requestClassification = function (e, state) {
  fakeMosaic(state)
}

EventBus.addEventListener(Events.SECTION.SEARCH.VIEW.SHOW_LIST, showList)
EventBus.addEventListener(Events.SECTION.SEARCH.VIEW.ADD_MOSAIC, addMosaic)
EventBus.addEventListener(Events.SECTION.SEARCH.VIEW.ADD_CLASSIFICATION, addClassification)
EventBus.addEventListener(Events.SECTION.SEARCH.REQUEST_CLASSIFICATION, requestClassification)