const electron = require('electron');
const axios = require('axios');

// EXPORTS
module.exports = {
    getAllUrls: getAllUrls,
    getUrlByKey: getUrlByKey,
    addUrl : addUrl
};

// REST API 
const ServiceAddressUri = 'http://localhost:32780/';        // When debugging this app on localhost (API & mongodb in docker)

// Service calls
function getAllUrls(){
    // HttpGet: http://<service>/api/littleurl
    const endPoint = ServiceAddressUri + 'api/littleurl';
    console.log(endPoint);

    // Call using axios - return the promise object
    return axios.get(endPoint)
        .then(response => {
            console.log(response.data);
            return  '{ "results": ' + JSON.stringify(response.data) + '}' ;
        });
}



function getUrlByKey (key) {
    // HttpGet: http://<service>/api/littleurl/<key>
    const endPoint = ServiceAddressUri + 'api/littleurl/' + key;
    console.log(endPoint);

    // Call using axios - return the promise object
    return axios.get(endPoint)
        .then(response => {
            console.log(response.data);
            return response.data.longUrl;
        });
}

function addUrl(longUrl){
    // HttpPost: http://<service>/api/littleurl
    //  payload: JSON { LongUrl: <longUrl> }
    const endPoint = ServiceAddressUri + 'api/littleurl';
    console.log(endPoint);

    // Call using axios - return the promise object
    return axios.post(endPoint, { LongUrl : longUrl })
        .then(response => {
            console.log(response.data);
            return response.data;
        });
}



