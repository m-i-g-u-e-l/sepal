/**
 * @author Mino Togna
 */
require( './scene-images-selection.css' )

var EventBus  = require( '../event/event-bus' )
var Events    = require( '../event/events' )
var Animation = require( '../animation/animation' )

var template = require( './scene-images-selection.html' )
var html     = $( template( {} ) )

var section                       = null
// section for selecting images
var selectionSection              = null
var imagesSelectionSection        = null
var imageSelectionSection         = null
var expandedImageSelectionSection = null
// section of selected images
var selectedSection               = null
var selectedSectionHeader         = null
var selectedSectionTableHeader    = null
var selectedSectionTableContent   = null
var selectedSectionTableRow       = null

var init = function () {
    
    var appSection = $( '#app-section' ).find( '.scene-images-selection' )
    if ( appSection.children().length <= 0 ) {
        var appSection = $( '#app-section' ).find( '.scene-images-selection' )
        appSection.append( html )
        
        section                       = appSection.find( '#scene-images-selection' )
        selectionSection              = section.find( '.selection-section' )
        imagesSelectionSection        = selectionSection.find( '.images-section' )
        imageSelectionSection         = appSection.find( '.image-section' )
        expandedImageSelectionSection = appSection.find( '.expanded-image-section' )
        //
        selectedSection               = section.find( '.selected-section' )
        selectedSectionHeader         = selectedSection.find( '.section-header' )
        selectedSectionTableHeader    = selectedSection.find( '.table-header' )
        selectedSectionTableContent   = selectedSection.find( '.table-content' )
        selectedSectionTableRow       = selectedSection.find( '.table-row' )
    }
    
}

var reset = function () {
    imagesSelectionSection.empty()
    selectedSectionTableContent.empty()
    selectedSectionTableHeader.hide()

    imagesSelectionSection.velocity( 'scroll', { duration: 0 } )
}

// Functions for selection section
var add = function ( sceneImage ) {
    var imgSection = getImageSectionForSelection( sceneImage )
    
    imagesSelectionSection.append( imgSection )
    imgSection.show()
}

var hideFromSelection = function ( sceneImage ) {
    var imgSection = imagesSelectionSection.find( '.' + sceneImage.sceneId )
    
    Animation.animateOut( imgSection )
    
    setTimeout( function ( e ) {
        Animation.removeAnimation( imgSection )
        imgSection.hide()
    }, 600 )
}

var showInSelection = function ( sceneImage ) {
    var imgSection = imagesSelectionSection.find( '.' + sceneImage.sceneId )
    
    imgSection.velocity( 'scroll', {
        container : imagesSelectionSection
        , duration: 600
        , delay   : 100
    } )
    
    Animation.animateIn( imgSection )
}

var getImageSectionForSelection = function ( sceneImage ) {
    var imgSection = imageSelectionSection.clone()
    imgSection.addClass( sceneImage.sceneId )
    
    var img = imgSection.find( 'img' )
    img.attr( 'src', sceneImage.browseUrl )
    
    var imgHover = imgSection.find( '.img-hover' )
    img.mouseenter( function () {
        imgHover.fadeIn( 150 )
        img.velocity( { opacity: 0.5 }, { duration: 150 } )
    } )
    imgHover.mouseleave( function () {
        imgHover.fadeOut( 150 )
        img.velocity( { opacity: 1 }, { duration: 150 } )
    } )
    
    imgHover.click( function () {
        expandedImageSelectionSection.find( 'img' ).attr( 'src', sceneImage.browseUrl ).click( function () {
            expandedImageSelectionSection.velocity( "stop" ).velocity( 'fadeOut', {
                delay   : 20,
                duration: 500
            } )
        } )
        expandedImageSelectionSection.find( '.cloud-cover' ).empty().append( '<i class="fa fa-cloud" aria-hidden="true"></i> ' + sceneImage.cloudCover )
        expandedImageSelectionSection.find( '.sensor' ).empty().append( '<i class="fa fa-rocket" aria-hidden="true"></i> ' + sceneImage.sensor )
        expandedImageSelectionSection.velocity( "stop" ).velocity( 'fadeIn', {
            delay   : 20,
            duration: 500
        } )
    } )
    
    //TODO : add daysFromTargetDay
    imgSection.find( '.cloud-cover' ).append( '<i class="fa fa-cloud" aria-hidden="true"></i> ' + sceneImage.cloudCover )
    imgSection.find( '.sensor' ).append( '<i class="fa fa-rocket" aria-hidden="true"></i> ' + sceneImage.sensor )
    
    imgSection.find( '.btn-add' ).click( function () {
        EventBus.dispatch( Events.SECTION.SCENE_IMAGES_SELECTION.SELECT, null, sceneImage )
    } )
    
    return imgSection
}

var addToSelectedSection = function ( sceneImage ) {
    var imgSection = selectedSectionTableRow.clone()
    imgSection.addClass( sceneImage.sceneId )
    
    var img = imgSection.find( 'img' )
    img.attr( 'src', sceneImage.browseUrl )
    
    imgSection.find( '.cloud-cover' ).append( sceneImage.cloudCover )
    imgSection.find( '.sensor' ).append( sceneImage.sensor )
    imgSection.find( '.btn-remove' ).click( function ( e ) {
        e.preventDefault()
        EventBus.dispatch( Events.SECTION.SCENE_IMAGES_SELECTION.DESELECT, null, sceneImage )
    } )
    
    selectedSectionTableContent.append( imgSection )
    
    Animation.animateIn( imgSection )
    
    imgSection.velocity( 'scroll', {
        container : selectedSectionTableContent
        , duration: 600
        , delay   : 100
    } )

    updateSelectedSectionHeader()
}

var removeFromSelectedSection = function ( sceneImage ) {
    var imgSection = selectedSectionTableContent.find( '.' + sceneImage.sceneId )
    
    setTimeout( function () {
        imgSection.hide()
    }, 600 )
    
    Animation.animateOut( imgSection, function () {
        imgSection.remove()
        updateSelectedSectionHeader()
    } )

}

var updateSelectedSectionHeader = function (  ) {
    if( selectedSectionTableContent.children().length > 0 ){
        selectedSectionTableHeader.show()
    } else {
        selectedSectionTableHeader.hide()
    }
}

var select   = function ( sceneImage ) {
    hideFromSelection( sceneImage )
    addToSelectedSection( sceneImage )
}
var deselect = function ( sceneImage ) {
    removeFromSelectedSection( sceneImage )
    showInSelection( sceneImage )
}

module.exports = {
    init      : init
    , reset   : reset
    , add     : add
    , select  : select
    , deselect: deselect
}