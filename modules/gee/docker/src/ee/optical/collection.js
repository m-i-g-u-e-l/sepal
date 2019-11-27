const ee = require('@google/earthengine')
const _ = require('lodash')
const moment = require('moment')
const dataSetSpecs = require('./dataSetSpecs')
const imageProcess = require('./imageProcess')

const allScenes = (
    {
        region,
        dates: {
            targetDate,
            seasonStart,
            seasonEnd,
            yearsBefore = 0,
            yearsAfter = 0
        } = {},
        dataSets,
        reflectance = 'TOA',
        brdfCorrect,
        panSharpen,
        compositeOptions: {
            corrections = [],
            mask = [],
            cloudBuffer = null
        } = {}
    }) => {
    const filter = ee.Filter.and(
        ee.Filter.bounds(region),
        dateFilter({seasonStart, seasonEnd, yearsBefore, yearsAfter})
    )
    return dataSets.reduce((mergedCollection, dataSet) =>
        mergeImageCollections(
            mergedCollection,
            createCollection({dataSet, reflectance, brdfCorrect, panSharpen, targetDate, filter})
        ),
    ee.ImageCollection([])
    )
}

const dateFilter = ({seasonStart, seasonEnd, yearsBefore, yearsAfter}) => {
    const dateFormat = 'YYYY-MM-DD'
    const filter = yearDelta =>
        ee.Filter.date(
            moment(seasonStart).add(yearDelta, 'years').format(dateFormat),
            moment(seasonEnd).add(yearDelta, 'years').format(dateFormat)
        )

    return ee.Filter.or(...[
        filter(0),
        _.range(0, yearsBefore).map(i => filter(i - 1)),
        _.range(0, yearsAfter).map(i => filter(i + 1)),
    ].flat())
}

const selectedScenes = ({reflectance, brdfCorrect, panSharpen, targetDate, scenes}) =>
    _.chain(scenes)
        .values()
        .flatten()
        .groupBy('dataSet')
        .mapValues(scenes =>
            scenes.map(scene => toEEId(scene))
        )
        .mapValues((ids, dataSet) =>
            createCollectionWithScenes({dataSet, reflectance, brdfCorrect, panSharpen, targetDate, ids})
        )
        .values()
        .reduce(
            (acc, collection) => mergeImageCollections(acc, collection),
            ee.ImageCollection([])
        )
        .value()

const createCollectionWithScenes = ({dataSet, reflectance, brdfCorrect, panSharpen, targetDate, ids}) =>
    createCollection({dataSet, reflectance, brdfCorrect, panSharpen, targetDate, filter: ee.Filter.inList('system:index', ids)})

const createCollection = ({dataSet, reflectance, brdfCorrect, panSharpen, targetDate, filter}) => {
    const dataSetSpec = dataSetSpecs[reflectance][dataSet]

    // const collection = ee.ImageCollection(dataSetSpec.collectionName)
    //     .filter(filter)
    // const image = ee.Image(collection.first())
    // const processedImage = imageProcess({dataSetSpec, reflectance, brdfCorrect, targetDate})(image)
    // return ee.ImageCollection([processedImage])
    
    return ee.ImageCollection(dataSetSpec.collectionName)
        .filter(filter)
        .map(imageProcess({dataSetSpec, reflectance, brdfCorrect, panSharpen, targetDate}))
}

const toEEId = ({id, dataSet, date}) =>
    dataSet === 'SENTINEL_2'
        ? id
        : toEELandsatId({id, date})

const toEELandsatId = ({id, date}) =>
    [
        id.substring(0, 2),
        '0',
        id.substring(2, 3),
        '_',
        id.substring(3, 9),
        '_',
        moment(date, 'YYYY-MM-DD').format('YYYYMMDD')
    ].join('')

const mergeImageCollections = (c1, c2) =>
    ee.ImageCollection(c1.merge(c2))

module.exports = {allScenes, selectedScenes}