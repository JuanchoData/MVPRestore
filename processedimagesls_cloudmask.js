var process3 = function(startYear, endYear, startMonth, endMonth, geometry) {
   
// Function to apply scaling factors to Landsat Surface Reflectance (SR) images
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2); // Scale optical bands
  // var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)  // Add scaled bands to image

}
// Function to apply cloud and shadow mask for Landsat 4, 5, and 7

function maskL457s(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud 
  // Bit 2 - Unused
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var saturationMask = image.select('QA_RADSAT').eq(0);
  // Combine the masks
  var mask = qaMask.and(saturationMask);
  // Ensure the mask is binary and of type Uint8
  mask = mask.toUint8();
  // Rename and copy properties to the output image
  return mask.rename('mask').copyProperties(image, image.propertyNames());
}
exports.maskL457s = maskL457s; 
   
/*var FmaskL8 = function(image) {
    var msk = image.select('QA_PIXEL');
    msk = msk
    //Cloud
    .neq(21826).and(msk.neq(21890)).and(msk.neq(22080)).and(msk.neq(22144)).and(msk.neq(22280))
    //Shadow
    .and(msk.neq(23888)).and(msk.neq(23952)).and(msk.neq(24088)).and(msk.neq(24216)).and(msk.neq(24344)).and(msk.neq(24472))
    //Cirrus
    .and(msk.neq(54596)).and(msk.neq(54852)).and(msk.neq(55052))
    // Cirrus shadow
    .and(msk.neq(56856)).and(msk.neq(56984)).and(msk.neq(57240))
  return msk.rename('mask')
        .copyProperties(image, image.propertyNames());
  };
*/ 
  var imgsLS5 = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
        .filterBounds(geometry)
        .filter(ee.Filter.calendarRange(5,10,"month"))
        .filter(ee.Filter.calendarRange(1984, 2012, "year"))
        .filter(ee.Filter.lte('CLOUD_COVER', 20))
        .map(applyScaleFactors)
  // Apply transformation
  imgsLS57 = imgsLS5.map(function(img){ //.map(etm2oliSR)
   return img.select(['QA_PIXEL','QA_RADSAT'])
        .rename(['QA_PIXEL','QA_RADSAT'])
  })
  
  var imgsLS57 = imgsLS57.map(maskL457s)
  // Landsat8 for 2013 
  var imgsLS8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
        .filterBounds(geometry)
        .filter(ee.Filter.calendarRange(5,10,"month"))
        .filter(ee.Filter.calendarRange(2013, 2023, "year"))
        .filter(ee.Filter.lte('CLOUD_COVER', 20))
        .map(applyScaleFactors)
//select and rename the bands to match images from 5 and 7
  imgsLS8 = imgsLS8.map(function(img){
  return img.select(['QA_PIXEL','QA_RADSAT'])
           .rename(['QA_PIXEL','QA_RADSAT'])
})
//Apply cloud mask
  var imgsLS8 = imgsLS8.map(maskL457s)
// Merge Landsat 5, 7, and 8 masked collections
  var imgsLS578mask = imgsLS57.merge(imgsLS8)
  var imgsLS578Fmask = imgsLS578mask.filterDate(startYear+'-'+startMonth, endYear+'-'+endMonth)
  var get_cloud = function(image) {
    var clou = image.select('mask')
  return clou
  }
  var cloud = imgsLS578Fmask.map(get_cloud)
  var summedCloudMask = cloud.reduce(ee.Reducer.sum());
  return summedCloudMask
  
}
exports.process3 = process3;
