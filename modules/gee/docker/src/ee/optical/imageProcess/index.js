const ee = require('@google/earthengine')
const _ = require('lodash')

const addMissingBands = require('./addMissingBands')
const addIndexes = require('./addIndexes')
const addSnow = require('./addSnow')
const addWater = require('./addWater')
const addShadowScore = require('./addShadowScore')
const addHazeScore = require('./addHazeScore')
const addSoil = require('./addSoil')
const addCloud = require('./addCloud')
const applyBRDFCorrection = require('./applyBRDFCorrection')
const applyPanSharpening = require('./applyPanSharpening')
const addDates = require('./addDates')
const applyQA = require('./applyQA')

const imageProcess = ({dataSetSpec, reflectance, brdfCorrect, panSharpen, targetDate}) => {
    const bands = dataSetSpec.bands
    const fromBands = Object.values(bands).map(band => band.name)
    const toBands = Object.keys(bands)
    const bandsToConvertToFloat = _.chain(bands)
        .pickBy(({scaled}) => scaled)
        .keys()
        .value()

    return image =>
        compose(
            normalize(fromBands, toBands, bandsToConvertToFloat),
            applyQA(toBands),
            addMissingBands(),
            addIndexes(),
            addSnow(),
            addWater(),
            addShadowScore(),
            addHazeScore(reflectance),
            addSoil(),
            addCloud(),
            maskClouds(),
            brdfCorrect && applyBRDFCorrection(dataSetSpec),
            panSharpen && toBands.includes('pan') && applyPanSharpening(),
            addDates(targetDate),
            toInt16()
        )(image)
}

const normalize = (fromBands, toBands, bandsToConvertToFloat) =>
    image => image
        .select(fromBands, toBands)
        .updateBands(bandsToConvertToFloat, image => image.divide(10000))

const maskClouds = () =>
    image => image.updateMask(
        image.select('cloud').not()
    )

const scale = ee.Image(10000)

const toInt16 = () =>
    image => image
        .multiply(scale)
        .int16()

const compose = (...operations) =>
    image =>
        operations
            .filter(operation => operation)
            .reduce(
                (image, operation) => image.select([]).addBands(
                    operation(image)
                ),
                image
            )

module.exports = imageProcess