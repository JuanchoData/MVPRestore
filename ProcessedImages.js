/* 
Cloud mask function for Landsat images
This function removes clouds and cirrus from Landsat images using the QA_PIXEL band.
*/
function maskLSclouds(image) {
  var qa = image.select('QA_PIXEL');

  // Define bit masks for clouds and cirrus
  var cloudBitMask = 1 << 3; // Bit 3 indicates cloud presence
  var cirrusBitMask = 1 << 4; // Bit 4 indicates cirrus cloud presence

  // Create a mask where both cloud bits are set to 0 (clear conditions)
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
 // Apply the mask, scale reflectance values, and retain properties
  return image.updateMask(mask).divide(10000).addBands(mask)
          .copyProperties(image, image.propertyNames())
  ;
} 
exports.maskLSclouds = maskLSclouds; 

/*
Calculate vegetation indices for Landsat images
*/
 
function calc_indicesLS(image){
    var date = ee.Date(image.get('system:time_start'));
    // var date = image.date();
    var years = date.difference(ee.Date('1970-01-01'), 'year');
    // Calculate NDVI
    var NDVI = image.normalizedDifference(['SR_B5', 'SR_B4']).float().rename('NDVI')
     // Calculate MCARI2 (Modified Chlorophyll Absorption in Reflectance Index 2)
    var MCARI2 = image.expression(
      '(1.5 * (2.5 * (N - R) - 1.3 * (N - G))) / ((((2.0 * N + 1) ** 2) - (6.0 * N - 5 * (R ** 0.5)) - 0.5) ** 0.5)',
      {
      'N': image.select('SR_B5'),
      'R': image.select('SR_B4'),
      'G': image.select('SR_B3')
    }).rename('MCARI2');//Modified Chlorophyll Absorption in Reflectance Index 2
     // Calculate VSDI (Vegetation Soil Dryness Index)
    var VSDI = image.expression(
      '1-(((SWIR2)-Blue) + (Red -Blue))',
     
      {
       'SWIR': image.select('SR_B6'), 
       'Blue': image.select('SR_B2'), 
       'Red': image.select('SR_B4'), 
       
       'SWIR2': image.select('SR_B7'), 
       }).rename('VSDI')
  // Calculate NSDI2 (Normalized Soil Difference Index)
  var NSDI2 = image.expression(
      '((SWIR-SWIR2)/(SWIR2))',
      // '1-((NIR-SWIR) + (NIR-Red))',
      {
       'SWIR': image.select('SR_B6'), 
       'SWIR2': image.select('SR_B7'), 
       }).rename('NSDI2')
  return image
    .addBands(ee.Image.constant(1))
    .addBands(ee.Image(years).rename('t')).float()
    .addBands(ee.Image(MCARI2))
    .addBands(ee.Image(VSDI))
    .addBands(ee.Image(NSDI2))
    .addBands(ee.Image(NDVI))
    .addBands(image.select('QA_PIXEL'))
}

exports.calc_indicesLS = calc_indicesLS;


/*
Detrend time series images using linear regression
*/

function detrendLS (collection){
  return collection.map(function(image){
  var independents = ee.List(['constant', 't']);
  var dependent = ee.String('VSDI');
  // Compute linear trend using regression
  var trend = collection.select(independents.add(dependent))
    .reduce(ee.Reducer.linearRegression(independents.length(), 1));
  var coefficients = trend.select('coefficients')
    .arrayProject([0])
    .arrayFlatten([independents]);
  // Compute detrended values
  return ee.Image(image.addBands(image.select(dependent).subtract(
          image.select(independents).multiply(coefficients).reduce('sum'))
          .rename(dependent)))
          .copyProperties(image, ['system:time_start']);
});
}

exports.detrendLS = detrendLS; 

/*
Calculate moisture variations using percentiles
*/
function calc_moist_vsdiLS (collection){
  var per5 = collection.reduce(ee.Reducer.percentile([5]));
  var per95 = collection.reduce(ee.Reducer.percentile([95]));
  return collection.map(function(img){
    var moist_VSDI = img.expression(
      '(VSDI - VSDI_p5) /(VSDI_p95-VSDI_p5)', 
      {
          'VSDI': img.select('VSDI'),
          'VSDI_p5': per5.select('VSDI_p5'),
          'VSDI_p95': per95.select('VSDI_p95'),
        }).rename('moist_VSDI')
        return img
        .addBands(ee.Image(moist_VSDI))
  });
  
}

exports.calc_moist_vsdiLS = calc_moist_vsdiLS; 

 
/***************************************************************
Classify vegetation based on moisture and MCARI2 threshold
****************************************************************/

function classifyLS (image,mci,mcari) {
  var mesics_MVsdi = image.expression(
          '((MCARI2 > mcari ) && (moist_VSDI > mci)) ? 1' +
          ': 0',
          
        {
          'moist_VSDI': image.select('moist_VSDI'),
          'MCARI2': image.select('MCARI2'),
          'mcari': mcari,
          'mci': mci
          
        }).rename('mesics_MVsdi')

  var mesics_vsdiOnly = image.expression(
          '(moist_VSDI >0.5) ? 1' +
          // ":(NDMI > 0.4) ? 1" +
          ': 0',
          
        {
          'moist_VSDI': image.select('moist_VSDI'),
          'MCARI2': image.select('MCARI2'),
          'NDMI': image.select('NDMI'),
          
        }).rename('mesics_vsdiOnly')
        
  var mesicsNDVI = image.expression(
          '(NDVI >0.3) ? 1' +
          // ":(NDMI > 0.4) ? 1" +
          ': 0',
          
        {
          'NDVI': image.select('NDVI'),
          
        }).rename('mesicsNDVI')

  return image
    .addBands(ee.Image(mesics_MVsdi))
    .addBands(ee.Image(mesics_vsdiOnly))
    .addBands(ee.Image(mesicsNDVI))
}
 
exports.classifyLS = classifyLS; 
/************************************************************
Process Landsat 5, 7, and 8 imagery for vegetation analysis
*************************************************************/
var processL578 = function(startYear, endYear, startMonth, endMonth, geometry, mcari, mci) {
  var startDate = ee.Date.fromYMD(startYear, ee.Number.parse(startMonth.split('-')[0]), 1);
  var endDate = ee.Date.fromYMD(endYear, ee.Number.parse(endMonth.split('-')[0]), 1)
                  .advance(1, 'month').advance(-1, 'day');  // End of the month
   
   var landsatColl  = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
                  .filterDate(startDate, endDate)
                  .filterBounds(geometry)
                  .filter(ee.Filter.calendarRange(5,10,'month'))
                  .filter(ee.Filter.lt('CLOUD_COVER',10))
                  // .map(maskS2clouds)
                  // .map(calc_indices) 
  var landsatNoClouds = landsatColl.map(maskLSclouds)
  var landsatIndices = landsatNoClouds.map(calc_indicesLS)
  var detrendedLS = detrendLS(landsatIndices)
  var landsatDiff  =  calc_moist_vsdiLS(detrendedLS)    


  var ClassifyLS = landsatDiff.map(function(image) {
    return classifyLS(image,mcari, mci).clip(geometry);  // Pass mcari and mci as arguments
  });

  // var mesic_area = Classify.map(mesic_area);
  return ClassifyLS
}
exports.processL578 = processL578; 


/********************************************************************************************************
Cloud mask Sentinel 2 images  
*********************************************************************************************************/

function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000).addBands(mask)
          .copyProperties(image, image.propertyNames())
  ;
}
exports.maskS2clouds = maskS2clouds; 

/* 
Calculate indices 
*/
function calc_indices(image){
    var date = ee.Date(image.get('system:time_start'));
    // var date = image.date();
    var years = date.difference(ee.Date('1970-01-01'), 'year');
    var NDVI = image.normalizedDifference(['B8', 'B4']).float().rename('NDVI')
    var MCARI2 = image.expression(
      '(1.5 * (2.5 * (N - R) - 1.3 * (N - G))) / ((((2.0 * N + 1) ** 2) - (6.0 * N - 5 * (R ** 0.5)) - 0.5) ** 0.5)',
      {
      'N': image.select('B8'),
      'R': image.select('B4'),
      'G': image.select('B3')
    }).rename('MCARI2');//Modified Chlorophyll Absorption in Reflectance Index 2
    
    var VSDI = image.expression(
      '1-(((SWIR2)-Blue) + (Red -Blue))',
      // '1-((NIR-SWIR) + (NIR-Red))',
      {
       'SWIR': image.select('B11'), 
       'Blue': image.select('B2'), 
       'Red': image.select('B4'), 
       'NIR': image.select('B8A'), 
       'SWIR2': image.select('B12'), 
       }).rename('VSDI')
  var NSDI2 = image.expression(
      '((SWIR-SWIR2)/(SWIR2))',
      // '1-((NIR-SWIR) + (NIR-Red))',
      {
       'SWIR': image.select('B11'), 
       'SWIR2': image.select('B12'), 
       }).rename('NSDI2')
  return image
    .addBands(ee.Image.constant(1))
    .addBands(ee.Image(years).rename('t')).float()
    .addBands(ee.Image(MCARI2))
    .addBands(ee.Image(VSDI))
    .addBands(ee.Image(NSDI2))
    .addBands(ee.Image(NDVI))
    .addBands(image.select('QA60'))
}


exports.calc_indices = calc_indices;


/* 
Detrend using timeseries images  
*/

function detrend (collection){
  return collection.map(function(image){
  var independents = ee.List(['constant', 't']);
  var dependent = ee.String('VSDI');
  var trend = collection.select(independents.add(dependent))
    .reduce(ee.Reducer.linearRegression(independents.length(), 1));
  var coefficients = trend.select('coefficients')
    .arrayProject([0])
    .arrayFlatten([independents]);

  return ee.Image(image.addBands(image.select(dependent).subtract(
          image.select(independents).multiply(coefficients).reduce('sum'))
          .rename(dependent)))
          .copyProperties(image, ['system:time_start']);
});
}

exports.detrend = detrend; 

/* 
Calculate changes in moisture using percentiles   
*/

function calc_moist_vsdi (collection){
  var per5 = collection.reduce(ee.Reducer.percentile([5]));
  var per95 = collection.reduce(ee.Reducer.percentile([95]));
  return collection.map(function(img){
    var moist_VSDI = img.expression(
      '(VSDI - VSDI_p5) /(VSDI_p95-VSDI_p5)', 
      {
          'VSDI': img.select('VSDI'),
          'VSDI_p5': per5.select('VSDI_p5'),
          'VSDI_p95': per95.select('VSDI_p95'),
        }).rename('moist_VSDI')
        return img
        .addBands(ee.Image(moist_VSDI))
  });
  
}

exports.calc_moist_vsdi = calc_moist_vsdi; 

/* 
Classify/threshold based on relative moisture and MCARI2
*/
function classify (image,mci,mcari) {
  var mesics_MVsdi = image.expression(
          '((MCARI2 > mcari ) && (moist_VSDI > mci)) ? 1' +
          ': 0',
          
        {
          'moist_VSDI': image.select('moist_VSDI'),
          'MCARI2': image.select('MCARI2'),
          'mcari': mcari,
          'mci': mci
          
        }).rename('mesics_MVsdi')

  var mesics_vsdiOnly = image.expression(
          '(moist_VSDI >0.5) ? 1' +
          // ":(NDMI > 0.4) ? 1" +
          ': 0',
          
        {
          'moist_VSDI': image.select('moist_VSDI'),
          'MCARI2': image.select('MCARI2'),
          'NDMI': image.select('NDMI'),
          
        }).rename('mesics_vsdiOnly')
        
  var mesicsNDVI = image.expression(
          '(NDVI >0.3) ? 1' +
          // ":(NDMI > 0.4) ? 1" +
          ': 0',
          
        {
          'NDVI': image.select('NDVI'),
          
        }).rename('mesicsNDVI')
  // var mesics_masked = mesics.multiply(lfmask).rename('mesics_masked'); 

  return image
    .addBands(ee.Image(mesics_MVsdi))
    .addBands(ee.Image(mesics_vsdiOnly))
    .addBands(ee.Image(mesicsNDVI))
}
 
exports.classify = classify; 

var processS2 = function(startYear, endYear, startMonth, endMonth, geometry, mcari, mci) {
  var startDate = ee.Date.fromYMD(startYear, ee.Number.parse(startMonth.split('-')[0]), 1);
  var endDate = ee.Date.fromYMD(endYear, ee.Number.parse(endMonth.split('-')[0]), 1)
                  .advance(1, 'month').advance(-1, 'day');  // End of the month
  var s2coll = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
                  .filterDate(startDate, endDate)
                  .filterBounds(geometry)
                  .filter(ee.Filter.calendarRange(5,10,'month'))
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',10))
                  // .map(maskS2clouds)
                  // .map(calc_indices) 
  var s2colNoClouds = s2coll.map(maskS2clouds)
  var s2colIndices = s2colNoClouds.map(calc_indices)
  var detrended = detrend(s2colIndices)
  var s2coldiff =  calc_moist_vsdi(detrended)    
//var Classify =  s2coldiff.map(classify)
  // var mesic_area = Classify.map(mesic_area)
  var Classify = s2coldiff.map(function(image) {
    return classify(image, mcari, mci).clip(geometry);  // Pass mcari and mci as arguments
  });

  // var mesic_area = Classify.map(mesic_area);
  return Classify
}
exports.processS2 = processS2; 


// Find all available NAIP images for a geometry
function findNAIP(geometry) {
  var init_collection = ee.ImageCollection('USDA/NAIP/DOQQ')
    .filterBounds(geometry)
    .filterDate('2002-01-01', '2022-12-31')
    // .filter(ee.Filter.listContains("system:band_names", "N"));

  var yearList = ee.List(init_collection.distinct(['system:time_start']).aggregate_array('system:time_start'));
  var init_years = yearList.map(function(y){
    return ee.Date(y).get('year');
  });

  // remove duplicates
  init_years = ee.Dictionary(init_years.reduce(ee.Reducer.frequencyHistogram())).keys();
  var years = init_years.map(function(x) {return ee.Number.parse(x)});

  // Available NAIP years with NIR band
  var NAIPAnnual= function(year){
    var start_date = ee.Date.fromYMD(year, 1, 1);
    var end_date = ee.Date.fromYMD(year, 12, 31);
    var collection = init_collection
      .filterDate(start_date, end_date);

    var time_start = ee.List(collection.aggregate_array('system:time_start')).sort().get(0);
    var time_end = ee.List(collection.aggregate_array('system:time_end')).sort().get(-1);
    var col_size = collection.size();
    var image = ee.Image(collection.mosaic()
    // .clip(geometry)
    );

    return image.set({'system:time_start': time_start, 'system:time_end': time_end, 'years': year});
  };

  var naip = ee.ImageCollection(years.map(NAIPAnnual));

  return naip;
}

exports.findNAIP = findNAIP; 

