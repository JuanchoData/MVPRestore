/*******************************************************************************
 * Model *
 * ******************************************************************************/
// Define a JSON object for storing model info (app data). 
var m = {}; 
/*******************************************************************************
************** Components *****************************
******************************************************************************/
// Define a JSON object for storing UI components. (User Interface)
var c = {};
// Define a control panel for user input.
c.controlPanel = ui.Panel();
// Define the main interactive map.
c.map = ui.Map(); //  Creates the main interactive map
var emptyRast = ee.Image().byte(); // <-- create empty raster for painting
var studyArea = ee.FeatureCollection('users/ns_boise/US_Sagebrush_Biome_2019')
var paintStudyarea = emptyRast.paint(studyArea, '000000', 1);
c.map.addLayer(paintStudyarea, {palette: '000000'},'Sagebrush Biome Area')
// Define an app info widget group.
c.info = {}; //like a empty container
c.info.titleLabel = ui.Label('MRRMaid MVPRestore: Monitoring mesic vegetation persistence (MVP) in the US Intermountain West sagebrush biome ', 
                              {fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0', padding:'0'});
c.info.aboutLabel = ui.Label(
  ' The application provides near-real time spatial and temporal dynamics of mesic vegetation using time-series Sentinel-2 and Landsat-[5,7,8] images.' +
  ' It uses a combination of moisture and vegetation-based threshold indices to differentiate mesic vegetation' +
  ' from other land cover types. The mapped results represent spatio-temporal dynamics while' +
  ' the time series scatter plot shows the variation of mesic vegetation within the user-defined area of interest (AOI)'+
  ' For more information'
  );
c.info.info = ui.Label(' For more information…')
c.info.url =   ui.Label('Published MVP Methods').setUrl('https://www.sciencedirect.com/science/article/pii/S0048969724006284?dgcid=author') 
c.info.zoom = ui.Label(' * Zoom in and pan to a site of interest.')
c.info.slct = ui.Label(' * Select either the Sentinel or the Landsat Sensor.')
c.info.sldr = ui.Label(' * Select the desired start and end dates using the sliders and boxes.'+
                       '   Sentinel imagery is available starting in 2017, and Landsat imagery is '+ 
                       '   available starting in 1984. MVP is available from May - October.')
c.info.dat = ui.Label(' * Input the Restoration Date into the box to visualize change'+
                       '  in MVP before and after this date. This date must be within'+ 
                       '  November-April of the desired year to map properly')
c.info.threshold = ui.Label(' *Adjust the Moisture Change Index (MCI) and/or Modified Chlorophyll' + 
                            '  Absorption Ratio Vegetation Index (MCARI) thresholds if necessary.' +
                            '  Use the Time Series Viewer to determine thresholds for your AOI.')
c.info.drw = ui.Label(' * Draw a polygon/rectangle around your AOI.') 

c.info.sbmt = ui.Label(' * Click the "Submit" button and be patient while the data loads. The map and time series plot will reflect the estimated MVP in the AOI.')
c.info.naip = ui.Label(' * Select National Agricultural Imagery Program (NAIP) images for comparison. This will load after computing MVP.');
c.info.dwnld = ui.Label(' * Download the map and/or time series plot for offline analysis.')

c.info.dsclmr = ui.Label(' ***Disclaimer - These datasets have high levels of accuracy, but as with any satellite-derived dataset, there are errors. High resolution base images and NAIP images (both with longer revisit periods than the imagery used for the modeled datasets) will show more detail than will be available in our outputs due to differences in spatial resolution.')

c.info.guide =   ui.Label('User guide').setUrl(
  'https://drive.google.com/file/d/1ZKqn-fttXWk5IdVysjyPtuDXxb0Mtz4_/view?usp=sharing') 
c.info.vid =   ui.Label('Video tutorial').setUrl(
  'https://drive.google.com/file/d/19t8DheO3Vw1kWQR-ShYyV5FXIbQSDAdP/view?usp=share_link') 
c.info.otherApp =   ui.Label('MRRMaid Homepage').setUrl(
  'https://www.boisestate.edu/hes/projects/mrrmaid-mesic-resource-restoration-monitoring-aid') 

c.info.contact =   ui.Label('Contact the authors: juancamilorojasl@u.boisestate.edu, nawa.shrestha@gmail.com',  {
    fontWeight: 'bold',
    color: '#6699CC',
    textDecoration: 'underline'
  })
c.info.citation =   ui.Label('Suggested citation: Rojas Lucero, J.C., Iskin, E., Shrestha, N., Kolarik, N. and Brandt, J. (2024). Decision Support Tool – GEE Web App for MVPRestore', {fontWeight: 'bold'})

c.info.panel = ui.Panel([c.info.titleLabel, c.info.aboutLabel,c.info.info,  c.info.guide, c.info.url,  c.info.otherApp, c.info.zoom,
                       c.info.slct,c.info.sldr,c.info.dat, c.info.threshold, c.info.drw, c.info.sbmt,c.info.naip, c.info.dwnld, 
                        c.info.dsclmr,   c.info.contact,c.info.citation
                          ]); 
// Define drawing tools 
var symbol = {
  polygon: '🔺',
  rectangle: '⬛',

};

c.buttons = ui.Panel({
  widgets: [
    ui.Button({
      label: symbol.polygon + ' Polygon',
      onClick: drawPolygon,
      style: {stretch: 'horizontal'}
    }),
    
    ui.Button({
      label: symbol.rectangle + ' Rectangle',
      onClick: drawRectangle,
      style: {stretch: 'horizontal'}
    }),
  ],
  style: {position: 'bottom-left'},
  layout: null,
});


// SET UP SECONDARY PANELS
// Sensor dropdown
var sensorLabel = ui.Label('Select Sensor',{fontWeight: 'bold'});
var sensorList = ['Sentinel-2','Landsat'];
var sensorSelect = ui.Select({items:sensorList, value:'Sentinel-2', style:{stretch: 'horizontal'}});
c.sensorPanel = ui.Panel([sensorLabel,sensorSelect], null, {stretch: 'horizontal'});

// years panel
var d = new Date(); //creates a Date object with the current date and time.
var y = d.getFullYear(); //extracts the current year 
var yearSectionLabel = ui.Label('Define Year Range',{fontWeight: 'bold'});
var aboutSensorLabel = ui.Label('Sentinel-2 Year Range: (2017-CURRENT)',
                            {fontWeight: 'bold',fontFamily: 'serif', textDecoration: 'underline'});

var aboutLSensorLabel = ui.Label('Landsat Year Range: (1984-CURRENT)',
                            {fontWeight: 'bold',fontFamily: 'serif', textDecoration: 'underline'});

// Select Year Range between 2017-Current for Sentinel-2'
var startYearLabel = ui.Label('Start Year');
var startYearslider = ui.Slider({min:1984, max:y, value:2017, step:1});
startYearslider.style().set('stretch', 'horizontal');

var endYearLabel = ui.Label('End Year');
var endYearslider = ui.Slider({min:1984, max:y, value:y-1, step:1});
endYearslider.style().set('stretch', 'horizontal');

c.yearsPanel = ui.Panel([
    yearSectionLabel,aboutSensorLabel,aboutLSensorLabel,
    ui.Panel([startYearLabel, startYearslider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}), 
    ui.Panel([endYearLabel  , endYearslider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}), 
]);
// date panel start date and end date
var dateSectionLabel = ui.Label('Define Date Range (month-day)',{fontWeight: 'bold'});
var startDayLabel = ui.Label('Start Date:');
var startDayBox = ui.Textbox({value:'05-01'});
startDayBox.style().set('stretch', 'horizontal');
var endDayLabel = ui.Label('End Date:');
var endDayBox = ui.Textbox({value:'10-31'});
endDayBox.style().set('stretch', 'horizontal');

c.datesPanel = ui.Panel([dateSectionLabel,
    ui.Panel(
      [startDayLabel, startDayBox, endDayLabel, endDayBox],
      ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}
    )]);
// date panel for restoration date
var yearSectionEventLabel = ui.Label('Define Year of the Event',{fontWeight: 'bold'});
var YearEvent = ui.Label('Year Event');
var startYearsliderEvent = ui.Slider({min:1984, max:y, value:2017, step:1});
startYearsliderEvent.style().set('stretch', 'horizontal');
c.eventsyear = ui.Panel([
    yearSectionEventLabel,
   ui.Panel([YearEvent, startYearsliderEvent], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'})
]);

var yearLabel = ui.Label('Define Event Date (month-day)',{fontWeight: 'bold'});
var startYearEvent = ui.Label('Start Event');
var yeareventLabel = ui.Label('Start Date:');
var starteventBox = ui.Textbox({value:'04-30'});

c.dateEvent = ui.Panel([yearLabel,
    ui.Panel(
      [startYearEvent, starteventBox],
      ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}
    )]);

//Index threshold panel
var thresholdLabel = ui.Label('Define Threshold using TS viewer',{fontWeight: 'bold'});
var MCARILabel = ui.Label('MCARI');
var MCARIFull = ui.Label('Modified Chlorophyll Absorption Ratio Index:');
var MCARIslider = ui.Slider({min:0, max:1, value:0.2, step:0.01});
MCARIslider.style().set('stretch', 'horizontal');


var mesicVSDILabel = ui.Label('MCI');
var MCIFull = ui.Label('Moisture Change Index:');
var VSDIslider = ui.Slider({min:0, max:1, value:0.4, step:0.1});
VSDIslider.style().set('stretch', 'horizontal');

c.thresholdPanel = ui.Panel(
  [
    thresholdLabel,MCARIFull,
    ui.Panel([MCARILabel, MCARIslider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'}), //
    MCIFull,
    ui.Panel([mesicVSDILabel  , VSDIslider], ui.Panel.Layout.Flow('horizontal'), {stretch: 'horizontal'})
  ] 
);

// Sensor dropdown
var timeSeriesLabel = ui.Label('Use time series viewer to find the appropriate threshold values',{fontWeight: 'bold'});

var tsViewerLink =   ui.Label('Time Series Viewer', {fontWeight: 'bold'}).setUrl('https://ns-boise.users.earthengine.app/view/timeseriesplot') 

c.tsViewerPanel = ui.Panel([timeSeriesLabel, tsViewerLink], null, {stretch: 'horizontal'});

// Define the location selector widget group.
c.info.titleFeature = ui.Label('Draw Area of Interest',{fontWeight: 'bold'});
c.info.titleFeature.style().set('stretch', 'horizontal');
c.featurePanel = ui.Panel([c.info.titleFeature]);
// submit panel
var submitButton = ui.Button({label: '7. Submit'});
c.submitButton = ui.Panel([submitButton], null, {stretch: 'horizontal'});

var chartPanel = ui.Panel({ //to display a chart in the bottom-right corner of the interface
  style:
      {height: '235px', width: '600px', position: 'bottom-right', shown: false}});

//Color Pallette
 function ColorBar(palette) {
  return ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {
      bbox: [0, 0, 1, 0.1],
      dimensions: '200x15',
      format: 'png',
      min: 0,
      max: 1,
      palette: palette,
    },
    style: {stretch: 'horizontal', margin: '0px 22px'},
  });
}

function makeLegend(lowLine, midLine, highLine,lowText, midText, highText, palette) {
  var  labelheader = ui.Label('Mesic Vegetation Persistence (%)',{margin: '5px 17px', textAlign: 'center', stretch: 'horizontal', fontWeight: 'bold'});
  var labelLines = ui.Panel(
      [
        ui.Label(lowLine, {margin: '-4px 21px'}),
        ui.Label(midLine, {margin: '-4px 0px', textAlign: 'center', stretch: 'horizontal'}),
        ui.Label(highLine, {margin: '-4px 21px'})
      ],
      ui.Panel.Layout.flow('horizontal'));
      var labelPanel = ui.Panel(
      [
        ui.Label(lowText, {margin: '0px 14.5px'}),
        ui.Label(midText, {margin: '0px 0px', textAlign: 'center', stretch: 'horizontal'}),
        ui.Label(highText, {margin: '0px 1px'})
      ],
      ui.Panel.Layout.flow('horizontal'));
    return ui.Panel({
      widgets: [labelheader, ColorBar(palette), labelLines, labelPanel], 
      style: {position:'bottom-left'}});
}
/*******************************************************************************
* Composition *
******************************************************************************/
// c.controlPanel.add(toolPanel);
c.controlPanel.add(c.info.panel);
c.controlPanel.add(c.sensorPanel);
c.controlPanel.add(c.yearsPanel);
c.controlPanel.add(c.datesPanel);
c.controlPanel.add(c.eventsyear);
c.controlPanel.add(c.dateEvent);
c.controlPanel.add(c.thresholdPanel);
c.controlPanel.add(c.tsViewerPanel);
c.controlPanel.add(c.featurePanel);
c.controlPanel.add(c.buttons);
c.controlPanel.add(c.submitButton);
c.controlPanel.add(makeLegend('|', '|', '|', "0 %", "50 %", "100 %", ['#ffffff', '#FF9E00', '#FFFF00','#00A0E9', '#0000C2']));
ui.root.clear();
ui.root.add(c.controlPanel);
c.map.add(chartPanel);
ui.root.add(c.map);
/////******************************************************************************
//*Styling*
////*******************************************************************************
c.controlPanel.style().set({ //Adjust the size of the controlPanel
  width: '400px',
  padding: '0px'
});
c.map.setOptions('HYBRID');
/*******************************************************************************
* Behaviors *
******************************************************************************/
var drawingTools = c.map.drawingTools();
drawingTools.setShown(false); // Hide the drawing tools panel by default.
/*******************************************************************************
* Remove Existing Drawings *
*******************************************************************************/
// This loop attempts to convert existing drawings into a FeatureCollection
while (drawingTools.layers().length() > 0) {
  var features = drawingTools.layers().get(0);
  drawingTools.layers().ee.FeatureCollection(features);
   print(featColl)
}
// Remove all existing drawings from the map to ensure a clean state
while (drawingTools.layers().length() > 0) {
  var layer = drawingTools.layers().get(0);
  drawingTools.layers().remove(layer);
}
var symbol = {color: 'black', fillColor: '#FFFFFF77'} // Define symbol properties for drawn geometries
// Create a dummy geometry layer (empty) to initialize the drawing tools
var dummyGeometry =
    ui.Map.GeometryLayer({geometries: null});
drawingTools.layers().add(dummyGeometry);

/*******************************************************************************
* Functions for Drawing and Clearing *
*******************************************************************************/
// Function to clear the currently drawn geometry
function clearGeometry() {
  var layers = drawingTools.layers();
  layers.get(0).geometries().remove(layers.get(0).geometries().get(0));
}
// Function to draw a rectangle
function drawRectangle() {
  clearGeometry(); // Remove any existing geometry before drawing a new one.
  drawingTools.setShape('rectangle');
  drawingTools.draw();
}
// Function to draw a polygon
function drawPolygon() {
  drawingTools.setShape('polygon');  // Set shape mode to "polygon."
  drawingTools.draw(); // Activate the drawing tool.
  clearGeometry();
}

/*******************************************************************************
* Scripts to process images *
*******************************************************************************/
// Import external scripts that contain functions for processing images
var process_images = require('users/EOregonMMaird/comp_exam:processedimages'); 
var process_LScloud = require('users/EOregonMMaird/comp_exam:processedimagesls_cloudmask'); 
var process_LSimages = require('users/EOregonMMaird/comp_exam:processedimg_nawa'); 
var currentPanel = null

/*******************************************************************************
* Function to Calculate Mean Precipitation (ppt) for a Given Image and Area *
*******************************************************************************/
function meanPpt(img, aoi){
  //Reduce the image to the mean value of the 'ppt' band over the specified area of interest (AOI)
  var mPpt = img.reduceRegion(ee.Reducer.mean(), 
              aoi,5000,null,null,false,1e23)
              .get('ppt')
  var date = ee.Date(img.get('system:time_start')); // Store the acquisition time of the image
    return img.set({'meanPpt': mPpt, 'date': date});
   // print(mPpt)
}
/*******************************************************************************
* Function to CHART PANEL VISIBLE *
*******************************************************************************/

function chartTimeSeries() {
  // Make the chart panel visible the first time a geometry is drawn
  if (!chartPanel.style().get('shown')) {
    chartPanel.style().set('shown', true);
  }
  drawingTools.setShape(null);  // Disable further drawing once the geometry is drawn
  
  var point = drawingTools.layers().get(0).geometries().get('0'); // Get the first drawn point geometry from the drawing tool
  var vecDisplay = ee.Image(0).updateMask(0).paint(point, '000000', 2); // Create an empty image and paint the selected point with black color (for visualization)
  // Get the drawn geometry to use as the area of interest (AOI)
  var aoi = drawingTools.layers().get(0).getEeObject();

  // Get user-selected values from UI sliders and dropdowns
  var startYear = startYearslider.getValue();
  var endYear = endYearslider.getValue();
  var yearEvent = startYearsliderEvent.getValue();
  var monthevent = starteventBox.getValue();
  var startMonth = startDayBox.getValue();
  var endMonth = endDayBox.getValue();
  var sensor = sensorSelect.getValue();
  var mcari = parseFloat(MCARIslider.getValue())
  var mci = parseFloat(VSDIslider.getValue())
 
  //// Landform processing to identify valley bottom areas ////
  var landforms = ee.Image('CSP/ERGo/1_0/US/landforms').select('constant').clip(aoi);
  var lfmask = landforms.eq(24).or(landforms.eq(34))
            .or(landforms.eq(41)).or(landforms.eq(42)); //Identify specific landform values that represent valley bottoms
  var lfmaskSelf=lfmask.selfMask()// Apply mask to keep only valley bottom pixels
  var valleyBottom = landforms.updateMask(lfmask).reduceToVectors({maxPixels: 1e13, scale: 30, geometryType: 'polygon',}); // Convert the valley bottom landforms to vector format
/*******************************************************************************
* Load PRISM Precipitation Data *
*******************************************************************************/  
 
    var datasetPpt = ee.ImageCollection("OREGONSTATE/PRISM/AN81d")
        .filterDate(startYear + '-' + startMonth, endYear + '-' + endMonth)
        .select('ppt');
  
    // Check the size of the collection
    var collectionSize = datasetPpt.size();
    // **NOTE**
    // If the dataset contains fewer than 4500 images, it processes each image individually.
    //If the dataset is too large (>= 4500 images), it aggregates the images into monthly means before further processing.
    // The above because GEE's restriction to plot.. 
  
    // Apply conditional logic
    if (collectionSize.getInfo() < 4500) {
      // If collection size is less than 4500, process the images
      datasetPpt = datasetPpt.map(function(img) {
        var meanPpt = img.reduceRegion({reducer: ee.Reducer.mean(),geometry: aoi,scale: 4600,maxPixels: 1e13}).get('ppt'); 
        var date = ee.Date(img.get('system:time_start'));
        return img.set({'meanPpt': meanPpt, 'date': date});
      });
    } else {
      //// Process images in monthly groups if dataset is too large... (GEE doesnot support plots with more than 4500 images)
        var startDate = ee.Date(startYear + '-' + startMonth);
        var endDate = ee.Date(endYear + '-' + endMonth).advance(1, 'month');    
        // Create a list of months (from start to end month) with year
        var monthsInRange = ee.List.sequence(0, endDate.difference(startDate, 'month'))
           .map(function(n) {
            return startDate.advance(n, 'month');
          }).flatten();
          //print(monthsInRange,'monthsInRange')
        //Compute mean precipitation for each month in the dataset
        var monthlyMeans = monthsInRange.map(function(date) {
          var year = ee.Date(date).get('year');
          var month = ee.Date(date).get('month');
          // Filter images by the current year and month
          var monthlyImages = datasetPpt.filter(ee.Filter.calendarRange(year, year, 'year'))
                                       .filter(ee.Filter.calendarRange(month, month, 'month'));
          // Calculate the mean of all images for the current month
          var monthlyMean = monthlyImages.mean();
          // Add a band for the monthly mean and set the month and year as properties
          return monthlyMean.set('month', month, 'year', year)
                 .set('system:time_start', ee.Date.fromYMD(year, month, 1).millis());
        });
        // Create an ImageCollection from the list of monthly means
        var monthlyImageCollection = ee.ImageCollection(monthlyMeans);
        //print(monthlyImageCollection,'monthlyImageCollection')
        // Function to get the number of bands in each image
        var getBandCount = function(image) { // getBandCount prevents errors by removing empty images before computing precipitation statistics
          return image.set('bandCount', image.bandNames().size()); 
        };
        var collectionWithBandCounts = monthlyImageCollection.map(getBandCount);
        //print(collectionWithBandCounts,'collectionWithBandCounts')
        var filteredCollection = collectionWithBandCounts.filter(ee.Filter.gt('bandCount', 0));
        //print(filteredCollection,'filteredCollection')
        var datasetPpt = ee.ImageCollection(filteredCollection)
                          .select('ppt')
                          .map(function(img){
                          var meanPpt = img.reduceRegion(ee.Reducer.mean(), aoi,4600,null,null,false,1e13) 
                          .get('ppt') // provides a single mean precipitation value per month
                          var date = ee.Date(img.get('system:time_start'));
                          return img.set({'meanPpt': meanPpt, 'date': date});
                          })  
                          //print(datasetPpt,'datasetPpt')
  }
  
  /*******************************************************************************
* Calculation mesic vegetation frequency (SENTINEL 2A)*
*******************************************************************************/ 

  if(sensor == 'Sentinel-2'){
     // Function to calculate mesic vegetation frequency
    function calcFrequency(collection){
    var min_occurence = 5; // Minimum occurrence threshold for mesic vegetation
    var mesics_sum_vsdi = collection.select('mesics_MVsdi').reduce(ee.Reducer.sum()); // Sum the mesic vegetation occurrences across the collection
  
    //Function to get the cloud mask for the footprint 
    var get_cldmsk = function(img){
      var cldmsk = img.select('QA60_1')
      return cldmsk
    }
    // Sum the cloud mask values over the collection
    var cldmskSums = collection.map(get_cldmsk).sum()
     // Compute mesic vegetation frequency by dividing occurrence sum by cloud mask sum
    var mesics_frequency_vsdi = mesics_sum_vsdi.divide(cldmskSums).multiply(100);
     // Apply threshold mask and round the values
    var mesics_frequency_masked_vsdi = mesics_frequency_vsdi
                                      .updateMask(mesics_frequency_vsdi.gt(min_occurence))
                                      .round()
                                      .rename('mesics_frequency_masked_vsdi');
    return ee.Image(mesics_frequency_masked_vsdi)
  }
    // Process Sentinel-2 images before the event
    var processedBefore = process_images.processS2(startYear, yearEvent, startMonth, monthevent, point, mcari, mci);
    var frequencyBefore = calcFrequency(processedBefore)
    // Process Sentinel-2 images after the event
    var processedAfter = process_images.processS2(yearEvent, endYear, monthevent, endMonth, point, mcari, mci);
    var frequencyAfter = calcFrequency(processedAfter)
    // Process Sentinel-2 images for the full time range
    var processedT = process_images.processS2(startYear, endYear, startMonth, endMonth, point, mcari, mci);
    var frequencyT = calcFrequency(processedT)
    // Compute mesic vegetation area percentages within the valley bottom region
    var mesic_areasT = processedT.map(function(i, aoi) {
      var mesicT = ee.Image(1).mask(i.select('mesics_MVsdi'));
      var mesicsAreaT =mesicT.multiply(ee.Image.pixelArea())
                    .reduceRegion(ee.Reducer.sum(), valleyBottom,10,null,null,false,1e13)
                    .get('constant'); //Mesic vegetation Area
      var geomAreaT = ee.Image(1).multiply(ee.Image.pixelArea()) 
                      .reduceRegion(ee.Reducer.sum(), valleyBottom,10,null,null,false,1e13)
                      .get('constant');//Total area
      var areaVSDIT = ee.Number(mesicsAreaT).divide(ee.Number(geomAreaT));
      return i.set({'areaVSDI': areaVSDIT.multiply(100)
    })});
    // Merge ppt dataset with mesic area calculations
    var merged = datasetPpt.merge(mesic_areasT);  
   
    // Function to update the restoration date, restricted to October to May
    var updateRestorationDate = function() {
      var year = startYearsliderEvent.getValue();  // Get the year from the slider
      var monthDay = starteventBox.getValue();     // Get the month and day from the textbox
    
      // Validate the month to ensure it's between October (10) and May (05)
      var month = parseInt(monthDay.split('-')[0]);  // Extract the month part (MM)
      
      // Check if the month is between October (10) and May (05)
      if ((month >= 10 && month <= 12) || (month >= 1 && month <= 5)) {
        var dateString = year + '-' + monthDay;      // Combine the year with the month and day to create a date string
        var restorationDate = ee.Date(dateString);   // Create the ee.Date object
    
        return restorationDate;
      } else {
        return null;  // Or handle invalid date case
      }
    };

    var restorationDate = updateRestorationDate(); // Change this to your actual restoration date
    
    // Create 10 dummy features for the restoration points
    var numPoints = 100; // Number of points
    var restorationPoints = []; // Array to hold the points
    // Generate 10 points with different y-values at the restoration date
    for (var i = 0; i < numPoints; i++) {
      // Generate a random y-value between 0 and 100 (or adjust as needed)
      var yValue = ee.Number(100).subtract(i * 1); // Decreasing values
      restorationPoints.push(ee.Feature(null, {
        'system:time_start': restorationDate,
        'restorationLine': yValue // Y-value for each point
      }));
    }
    // Convert the array of points into a FeatureCollection
    var restorationFeatureCollection = ee.FeatureCollection(restorationPoints);
    
    // Assuming merged is your feature collection with meanPpt and areaVSDI properties
    // Add the restoration features to your merged feature collection
    var mergedWithRestoration = merged.merge(restorationFeatureCollection);
    
    // Create chart displaying mesic area, precipitation, and restoration timeline
    var chartArea = ui.Chart.feature.byFeature({
        features: mergedWithRestoration,
        xProperty: 'system:time_start',
        yProperties: ['meanPpt', 'areaVSDI', 'restorationLine']
      })
      .setSeriesNames(['Precipitation (mm)', 'Mesic Area', 'Restoration Date'])
      .setChartType('ColumnChart')
      .setOptions({
        title: 'Mesic Area (%) and Precipitation in Area of Interest',
        series: {
          0: { targetAxisIndex: 1, type: 'bar', color: '1d6b99' },
          1: { targetAxisIndex: 0, type: 'line', lineWidth: 0, pointSize: 2, color: 'e37d05' },
          2: {
            type: 'scatter', // Use scatter for points
            lineWidth: 0,
            pointSize: 1, // Size of the points
            color: 'ff0000', // Color of the points
          },
        },
        hAxis: {
          title: 'Date',
          titleTextStyle: { italic: false, bold: true }
        },
        vAxes: {
          0: {
            title: 'Mesic Area (%)',
            baseline: 0,
            titleTextStyle: { italic: false, bold: true, color: 'e37d05' }
          },
          1: {
            title: 'Precipitation (mm)',
            titleTextStyle: { italic: false, bold: true, color: '1d6b99' }
          },
        },
        bar: { groupWidth: '40%' },
      });

  } 
  
/*******************************************************************************
  * Calculation mesic vegetation frequency (landsat)*
*******************************************************************************/ 
  if(sensor == 'Landsat') {
    var cldmskSums = process_LScloud.process3(startYear, endYear, startMonth, endMonth, point)
     // Function to calculate mesic vegetation frequency for Landsat imagery
    function calcFrequencyLS(collection,cldmskSums){
        var min_occurence = 5; // Minimum occurrence threshold for masking
        var mesics_sum_vsdi = collection.select('mesics_MVsdi').reduce(ee.Reducer.sum());
        var mesics_frequency_vsdi = mesics_sum_vsdi.divide(cldmskSums).multiply(100); // Compute frequency percentage
        var mesics_frequency_masked_vsdi = mesics_frequency_vsdi
                                          .updateMask(mesics_frequency_vsdi.gt(min_occurence))
                                          .round()
                                          .rename('mesics_frequency_masked_vsdi');
        return ee.Image(mesics_frequency_masked_vsdi)
      } 
       // Process Landsat images before the event
       var processedLS_Before = process_LSimages.processL578(startYear, yearEvent, startMonth, monthevent, point, mcari, mci);
        processedLS_Before = processedLS_Before.select([
           'b', 'g', 'r', 'nir', 'swir1', 'swir2', 'QA_PIXEL', 
           'constant', 't', 'MCARI2', 'VSDI', 'NDVI', 'VSDI_1', 'moist_VSDI',
           'mesics_MVsdi', 'mesicsNDVI'
          ]);
        
        var frequencyBefore = calcFrequencyLS(processedLS_Before,cldmskSums);
        // Process Landsat images after the event 
        var processedLSAfter = process_LSimages.processL578(yearEvent, endYear, monthevent, endMonth, point, mcari, mci);
        processedLSAfter = processedLSAfter.select([
            'b', 'g', 'r', 'nir', 'swir1', 'swir2', 'QA_PIXEL', 
            'constant', 't', 'MCARI2', 'VSDI', 'NDVI', 'VSDI_1', 'moist_VSDI',
            'mesics_MVsdi', 'mesicsNDVI'
          ]);
        var cldmskSums = process_LScloud.process3(yearEvent, endYear, monthevent, endMonth, point)
        var frequencyAfter = calcFrequencyLS(processedLSAfter,cldmskSums);
          
        // Process Landsat images for the full time range  
        var processedLST = process_LSimages.processL578(startYear, endYear, startMonth, endMonth, point,mcari, mci);
        processedLST = processedLST.map(function(img) {
        return img.select([
           'b', 'g', 'r', 'nir', 'swir1', 'swir2', 'QA_PIXEL', 
            'constant', 't', 'MCARI2', 'VSDI', 'NDVI', 'VSDI_1', 'moist_VSDI',
            'mesics_MVsdi', 'mesicsNDVI'
          ]);
        });
          
        var cldmskSums = process_LScloud.process3(startYear, endYear, startMonth, endMonth, point)
        var frequencyT = calcFrequencyLS(processedLST,cldmskSums)
          
        // Process Landsat images for the full time range
        var processedLST= processedLS_Before.merge(processedLSAfter);
        var processedLST= processedLST.map(function(img) {
        return img.select(['mesics_MVsdi', 'mesicsNDVI','constant', 't'
        ])});
          
        // Calculate mesic area percentages in valley bottom regions
        var mesic_areasLST = processedLST.map(function(i, aoi) {
        var mesicT = ee.Image(1).mask(i.select('mesics_MVsdi'))
        var mesicsAreaT =mesicT.multiply(ee.Image.pixelArea())
                        .reduceRegion(ee.Reducer.sum(), valleyBottom,10,null,null,false,1e13)
                        .get('constant');
        var geomAreaT = ee.Image(1).multiply(ee.Image.pixelArea()) 
                        .reduceRegion(ee.Reducer.sum(), valleyBottom,10,null,null,false,1e13)
                        .get('constant');
        var areaVSDIT = ee.Number(mesicsAreaT).divide(ee.Number(geomAreaT));
          return i.set({'areaVSDI': areaVSDIT.multiply(100)
        })});
        //print(mesic_areasLST,'mesic_areasLST')
          
        var mergedLS = datasetPpt.merge(mesic_areasLST);
        // Function to update the restoration date, restricted to October to May
        var updateRestorationDateLS = function() {
        var year = startYearsliderEvent.getValue();  // Get the year from the slider
        var monthDay = starteventBox.getValue();     // Get the month and day from the textbox
          
            // Validate the month to ensure it's between October (10) and May (05)
        var month = parseInt(monthDay.split('-')[0]);  // Extract the month part (MM)
            
            // Check if the month is between October (10) and May (05)
        if ((month >= 10 && month <= 12) || (month >= 1 && month <= 5)) {
            var dateString = year + '-' + monthDay;      // Combine the year with the month and day to create a date string
            var restorationDate = ee.Date(dateString);   // Create the ee.Date object
          
            return restorationDate;
            } else {
            return null;  // Or handle invalid date case
            }
        };
      
        var restorationDateLS = updateRestorationDateLS(); // Change this to your actual restoration date
          
          // Create 10 dummy features for the restoration points
        var numPointsLS = 100; // Number of points
        var restorationPointsLS = []; // Array to hold the points
          
          // Generate 10 points with different y-values at the restoration date
        for (var i = 0; i < numPointsLS; i++) {
          // Generate a random y-value between 0 and 100 (or adjust as needed)
          var yValueLS = ee.Number(100).subtract(i * 1); // Decreasing values
          restorationPointsLS.push(ee.Feature(null, {
            'system:time_start': restorationDateLS,
            'restorationLine': yValueLS // Y-value for each point
          }));
        }
          
            // Convert the array of points into a FeatureCollection
        var restorationFeatureCollectionLS = ee.FeatureCollection(restorationPointsLS);
         
        // Assuming merged is your feature collection with meanPpt and areaVSDI properties
        // Add the restoration features to your merged feature collection
        var mergedWithRestorationLS = mergedLS.merge(restorationFeatureCollectionLS);
        print(mergedWithRestorationLS,'mergedWithRestorationLS')
        print(mergedLS,'mergedLS')
          
        // Create the chart with the new restoration points
        var chartArea = ui.Chart.feature.byFeature({
            features: mergedWithRestorationLS,
            xProperty: 'system:time_start',
            yProperties: ['meanPpt', 'areaVSDI', 'restorationLine']
          })
          .setSeriesNames(['Precipitation (mm)', 'Mesic Area', 'Restoration Date'])
          .setChartType('ColumnChart')
          .setOptions({
            title: 'Mesic Area (%) and Precipitation in Area of Interest',
            series: {
              0: { targetAxisIndex: 1, type: 'bar', color: '1d6b99' },
              1: { targetAxisIndex: 0, type: 'line', lineWidth: 0, pointSize: 2, color: 'e37d05' },
              2: {
                  type: 'scatter', // Use scatter for points
                  lineWidth: 0,
                  pointSize: 1, // Size of the points
                  color: 'ff0000', // Color of the points
                },
              },
              hAxis: {
                title: 'Date',
                titleTextStyle: { italic: false, bold: true }
              },
              vAxes: {
                0: {
                  title: 'Mesic Area (%)',
                  baseline: 0,
                  titleTextStyle: { italic: false, bold: true, color: 'e37d05' }
                },
                1: {
                  title: 'Precipitation (mm)',
                  titleTextStyle: { italic: false, bold: true, color: '1d6b99' }
                },
              },
              bar: { groupWidth: '40%' },
            });

 }
 
 /*******************************************************************************
  * Define an SLD style color ramp to apply to the image*
*******************************************************************************/ 
  var sld_ramp =
    '<RasterSymbolizer>' +
      '<ColorMap type="ramp" extended="false">' +
        '<ColorMapEntry color="#ffffff" quantity="5" label="5"/>' +
        '<ColorMapEntry color="#FF9E00" quantity="17.5" label="17.5" />' +
        '<ColorMapEntry color="#FFFF00" quantity="30" label="30" />' +
        '<ColorMapEntry color="#A0FF60" quantity="42.5" label="42.5" />' +
        '<ColorMapEntry color="#00FFFF" quantity="55" label="55" />' +
        '<ColorMapEntry color="#00A0E9" quantity="67.5" label="67.5" />' +
        '<ColorMapEntry color="#0000C2" quantity="80" label="80" />' +
        '<ColorMapEntry color="#0000C2" quantity="100" label="100" />' +
      '</ColorMap>' +
    '</RasterSymbolizer>';
  
  // Assuming 'frequency' is the variable representing the mesic vegetation persistence layer.
  // Apply the SLD style to the frequency image.
  var frequencyAfter = frequencyAfter.clip(aoi)
  var frequencyBefore = frequencyBefore.clip(aoi)
  var styFrequencyT= frequencyAfter.sldStyle(sld_ramp);
  var styFrequencyB= frequencyBefore.sldStyle(sld_ramp);
  
  c.map.layers().reset();
  c.map.layers().set(1, ui.Map.Layer(styFrequencyB, 
                  {},
                  'Before: Mesic Vegetation Persistence '));
  c.map.layers().set(2, ui.Map.Layer(styFrequencyT, 
                  {},
                  'After: Mesic Vegetation Persistence'));
  c.map.layers().set(3, ui.Map.Layer(vecDisplay, {palette: '000000'},'AOI'));
  
  // Replace the existing chart in the chart panel with the new chart.
  chartPanel.widgets().set(0, chartArea)

 /*******************************************************************************
  * Define a function to generate a download URL of the image for the viewport region.*
*******************************************************************************/ 
  // Define the scale for the frequency image
  var scales=frequencyT.projection().nominalScale()
  // Define the function for generating the download URL for the selected region (BEFORE AND AFTER)
  function downloadImg() { 
    var viewBounds = drawingTools.layers().get(0).toGeometry()
    var downloadArgs = {
      name: 'ee_imageA',
      crs: 'EPSG:5070',
      scale: 10,
      region: viewBounds//.toGeoJSONString()
   }; 
   var downloadArgsB = {
      name: 'ee_imageB',
      crs: 'EPSG:5070',
      scale: 10,
      region: viewBounds//.toGeoJSONString()
   };
  // Generate download URL for the 'After' image (frequencyAfter)
   var urlAfter = frequencyAfter.getDownloadURL(downloadArgs);
   // Generate download URL for the 'Before' image (frequencyBefore)
   var urlBefore = frequencyBefore.getDownloadURL(downloadArgsB);
   // Set the download URL for the label showing 'After' image
   urlLabelAfter.setUrl(urlAfter);
     // Make the 'After' download label visible
   urlLabelAfter.style().set({shown: true});
    // Set the download URL for the label showing 'Before' image
   urlLabelBefore.setUrl(urlBefore);
   // Make the 'Before' download label visible
   urlLabelBefore.style().set({shown: true});
  }
  // If there is a panel already added, remove it
    if (currentPanel) {
      c.map.remove(currentPanel);
    }
  // Create a download button UI element
  var downloadButton = ui.Button('Download', downloadImg);
  // Create labels to show download links for 'Before' and 'After' images (initially hidden)
  var urlLabelAfter = ui.Label('Download mapped data (After) ', {shown: false});
  var urlLabelBefore = ui.Label('Download mapped data (Before) ', {shown: false});
  // Add the download button and the labels to a panel
  var panel = ui.Panel([downloadButton,  urlLabelAfter,urlLabelBefore]);
  // Add the panel to the map
  c.map.add(panel);
  // Set the current panel variable to the new panel created
  currentPanel = panel;
  // Reset the drawing tools shape and hide the dummy geometry
  drawingTools.setShape(null);
  dummyGeometry.setShown(false)
}


/*******************************************************************************
  *function to draw NAIP images*
*******************************************************************************/ 
// Variable to hold the current selector for NAIP images
var currentselector = null;
// Function to fetch and render NAIP images within the selected area of interest (AOI)
var naipImages = function(){
  // Get the geometry of the AOI from the drawing tools
  var aoi = drawingTools.layers().get(0).toGeometry()//.getEeObject();
  // Fetch NAIP images based on the AOI
  var naip_im = process_images.findNAIP(aoi);
  // Function to render the NAIP image for a specific date range
  function renderDateRange(date) {
    var image = naip_im.filterDate(ee.Date(date), ee.Date(date).advance(1, 'day'))
    // Visualization parameters for true-color rendering (RGB bands)
    var trueColorVis = {
      min: 0.0,
      max: 255.0,
      bands: ['R', 'G', 'B']};
  // Create a new map layer for the selected NAIP image
    var layer = ui.Map.Layer(image, trueColorVis, 'NAIP')
  // Set the newly created layer in the third position on the map layers
    c.map.layers().set(2, layer);
  
  }
  // Get all unique dates for the available NAIP images
  var allDates = ee.List(naip_im.aggregate_array('system:time_start'));
  var allDatesFormatted = allDates.map(function(date){
        return ee.Date(date).format('YYYY-MM-dd')}).distinct(); // Format dates as strings
    
  allDatesFormatted.evaluate(renderSlider) 
  function renderSlider(dates) {
    var selector = ui.Select({
      items: dates, 
      placeholder: 'Select NAIP Image',
      // value: dates[0], 
      onChange: renderDateRange,
      });
  // Create a panel to hold the selector UI element
      var selectorpanel = ui.Panel([selector])
  // If there is a panel already added, remove it
      if (currentselector) {
        c.map.remove(currentselector);
      }
  // Add the new selector panel to the map
      c.map.add(selectorpanel);
  // Update the global variable to store the current panel
      currentselector = selectorpanel;
   }
}

submitButton.onClick(ui.util.debounce(naipImages, 500)); // Debounced event for NAIP image selection
submitButton.onClick(ui.util.debounce(chartTimeSeries, 500)); // Debounced event for chart generation



