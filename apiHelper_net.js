// const { net } = require('electron');

// // EXPORTS
// module.exports = {
//     getAllUrls: getAllUrls,
//     getUrlByKey: getUrlByKey,
//     addUrl : addUrl
// };

// // REST API 
// const ServiceAddressUri = 'http://localhost:32780/';        // When debugging this app on localhost (API & mongodb in docker)
// const BaseAddressPrefix =  'http://mylittleurl.us/';        // Public site address for prefix

// // Service calls
// async function getAllUrls(){
//     let returnVal = '';
//     // HttpGet: http://<service>/api/littleurl
//     const endPoint = ServiceAddressUri + 'api/littleurl';
//     console.log(endPoint);

//     // Call using net.request 
//     const request = net.request(endPoint);
//     await request.on('response', (response) => {
//         if(response.statusCode != 200){
//             console.log('error: ' + response.statusMessage);
//             // return response.statusMessage;
//         }
//         response.on('data', (body) => {
//             console.log('body: ' + body);
//             returnVal =  '{ "results": ' + JSON.stringify(body) + '}' ;
//         });
//     });
//     request.end();

//     console.log('returnVal: ' + returnVal);
//     return returnVal;
// }

// async function getUrlByKey (key) {
//     let returnVal = '';

//     // HttpGet: http://<service>/api/littleurl/<key>
//     const endPoint = ServiceAddressUri + 'api/littleurl/' + key;
//     console.log(endPoint);

//     // Call using net.request 
//     const request = net.request(endPoint, (response) => {
//         if(response.statusCode != 200){
//             console.log('error: ' + response.statusMessage);
//             // return response.statusMessage;
//         }
//         response.on('data', (body) => {
//             console.log('body: ' + body);
//             returnVal =  body.longUrl;
//         });
//     });
//     request.end();

//     return returnVal;
// }

// function addUrl(longUrl){
// //     // HttpPost: http://<service>/api/littleurl
// //     //  payload: JSON { LongUrl: <longUrl> }
// //     const endPoint = ServiceAddressUri + 'api/littleurl';
// //     console.log(endPoint);

// //     // Call using request - return the promise object
// //     request.post({ 
// //                     "headers" : { "content-type" : "application/json"},
// //                     "url" : endPoint,
// //                     "body" : JSON.stringify({ "LongUrl" : longUrl })
// //                  }, (error, response, body) => {
// //                     if(error){
// //                          return error;
// //                     }
// //                     return body;
// //                  });
// }



