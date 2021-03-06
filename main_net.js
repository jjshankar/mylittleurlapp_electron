const electron = require('electron');
const url = require('url');
const path = require('path');

// USES NATIVE XmlHttpRequest 
const APPNAME = 'MyLittleURL (net)'

// REST API 
const Protocol = "http:"
//const ServiceAddressUri = 'localhost:32780';        // When debugging this app on localhost (API & mongodb in docker)
const ServiceAddressUri = 'localhost:53284';        // When debugging this app on localhost API (mongodb in docker)
// const ServiceAddressUri = 'localhost:32680';        // When debugging this app on localhost (API in docker, Azure storage)
// const ServiceAddressUri = 'localhost:5001';        // When debugging this app on localhost (API localhost, Azure storage)
//const ServiceAddressUri = 'jjs-mylittleazurlapi.azurewebsites.net';        // When debugging this app on localhost (API on Azure, Azure storage)
const BaseAddressPrefix = 'http://lilurl.us/';        // Public site address for prefix


const { app, BrowserWindow, Menu, ipcMain, net, shell } = electron;

let mainWindow;
let serviceAlive;

// Create menu template
const mainMenuTemplate = [
    {
        label: 'Macs',
        submenu: [
            {
                label: 'About ' + APPNAME,
                click() {
                    loadAboutWindow();
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Hide ' + APPNAME,
                role: 'hide'
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit',
                // accelerator: process.platform == 'darwin'? 'Command+Q' : 'Ctrl+Q',
                accelerator: 'CmdOrCtrl+Q',
                click() {
                    app.quit();
                }
            }
        ]
    },
    {
        label: 'File',
        submenu: [
            {
                label: 'Home',
                // accelerator: process.platform == 'darwin'? 'Command+A' : 'Ctrl+A',
                accelerator: 'CmdOrCtrl+O',
                click() {
                    loadMainWindow('mainWindow.html');
                }

            },
            {
                label: 'Fetch',
                accelerator: 'CmdOrCtrl+F',
                click() {
                    loadMainWindow('fetchWindow.html');
                }
            },
            {
                label: 'List',
                accelerator: 'CmdOrCtrl+L',
                click() {
                    // Load the listWindow HTML page in main window
                    loadList();
                }
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'selectall' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { type: 'separator' },
            { role: 'undo' },
            { role: 'redo' }
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                role: 'reload',
            },
            {
                label: 'Toggle Dev Tools',
                accelerator: 'CmdOrCtrl+I',
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            }
        ]
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'About ' + APPNAME,
                role: 'about',
                click() {
                    loadAboutWindow();
                }
            }
        ]
    }
]

// // For Macs
// if (process.platform == 'darwin') {
//     mainMenuTemplate.unshift([{}]);
// }


// Listen for app.ready
app.on('ready', () => {
    // Test service health
    // HttpGet: http://<service>/api/littleurl
    const endPoint = Protocol + '//' + ServiceAddressUri + '/api/littleurl';
    console.log('[app.on(ready)]~ ' + endPoint);

    // Call using net.request 
    const request = net.request(endPoint, (response) => {
        response.on('data', () => {
            if (response.statusCode != 200) {
                console.log('[app.on(ready)]~ error: ' + response.statusMessage);
                serviceAlive = false;
            }
            else {
                serviceAlive = true;
            }
        })
    });
    request.end();

    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });
    loadMainWindow('mainWindow.html');

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on('onFocus', () => {
        console.log('[mainWindow.on(focus)]:')
        if (!mainWindow.enabled) {
            event.preventDefault();
            if (aboutWindow)
                aboutWindow.flashFrame();
        }
    });


});


// Listen for mylittleurl:add event
ipcMain.on('mylittleurl:add', (event, item) => {
    console.log('mylittleurl:add - ' + item);

    if (item.toLocaleLowerCase().startsWith(BaseAddressPrefix)) {
        console.log('Invalid attempt.');
        mainWindow.webContents.send('mylittleurl:error', 'Invalid attempt.  This is already a LittleURL.');

    }
    else {
        // HttpPost: http://<service>/api/littleurl
        //  payload: JSON { LongUrl: <longUrl> }
        const endPoint = Protocol + '//' + ServiceAddressUri + '/api/littleurl';
        console.log(endPoint);

        // Payload
        const payload = '{ "LongUrl" : "' + item + '"}';

        // Set up http call
        const options = {
            method: 'POST',
            protocol: Protocol,
            host: ServiceAddressUri,
            path: '/api/littleurl',
            headers: {
                'content-type': 'application/json'
            }
        };

        console.log(options);

        // Call using net.request 
        try {
            const request = net.request(options);
            request.setHeader('Client-Secret', 'secretKey');
            request.on('response', (response) => {
                response.on('data', (body) => {
                    console.log('body: ' + body);

                    if (response.statusCode >= 300) {
                        console.log('error: ' + response.statusMessage);
                        mainWindow.webContents.send('mylittleurl:error', response.statusMessage);
                    }
                    else {
                        // Send event to display result
                        var result = JSON.parse(body);
                        mainWindow.webContents.send('mylittleurl:result', result.longUrl);

                        // Calc reudction pct
                        const shortUrl = BaseAddressPrefix + result.shortUrl;
                        reductionPct = 100 * (result.longUrl.length - shortUrl.length) / result.longUrl.length;
                        console.log('reductionPct = ' + reductionPct.toFixed(2));

                        // Send event to display result
                        mainWindow.webContents.send('mylittleurl:show', shortUrl, reductionPct.toFixed(2));
                    }
                });
            });

            // Add new URL and get result from REST API
            request.write(payload);
            request.end();
        }
        catch (err) {
            console.log('EXCEPTION: ' + err);
        }
    }
});

// Listen for mylittleurl:fetch event
ipcMain.on('mylittleurl:fetch', (event, item) => {
    console.log('mylittleurl:fetch - ' + item);

    // HttpGet: http://<service>/api/littleurl/<key>
    const endPoint = Protocol + '//' + ServiceAddressUri + '/api/littleurl/' + item;
    console.log(endPoint);

    // Call using net.request 
    const request = net.request(endPoint);
    request.setHeader('Client-Secret', 'secretKey');
    request.on('response', (response) => {
        response.on('data', (body) => {
            console.log('body: ' + body);

            if (response.statusCode >= 300) {
                console.log('error: ' + response.statusMessage);
                mainWindow.webContents.send('mylittleurl:error', response.statusMessage);
            }
            else {
                // Send event to display result
                var result = JSON.parse(body);
                mainWindow.webContents.send('mylittleurl:result', result.longUrl);
            }
        });
    });
    request.end();
});

// Listen for mylittleurl:delete event
ipcMain.on('mylittleurl:delete', (event, item) => {
    console.log('mylittleurl:delete - ' + item);

    // HttpDelete: http://<service>/api/littleurl/<key>
    // Set up http call
    const options = {
        method: 'DELETE',
        protocol: Protocol,
        host: ServiceAddressUri,
        path: '/api/littleurl/' + item,
    };

    // Call using net.request 
    const request = net.request(options);
    request.setHeader('Client-Secret', 'secretKey');
    request.on('response', (response) => {
        response.on('data', (body) => {
            console.log('deleted body: ' + body);

            if (response.statusCode >= 300) {
                console.log('error: ' + response.statusMessage);
                mainWindow.webContents.send('mylittleurl:error', response.statusMessage);
            }
            else {
                // Send event to display result
                var result = JSON.parse(body);
                console.log("DELETE Success: " + body);
                if(item === result.shortUrl){
                    // Load the listWindow HTML page in main window
                    loadList();
                }
            }
        });
    });
    request.end();
});

// Listen for mylittleurl:undelete event
ipcMain.on('mylittleurl:undelete', (event, item) => {
    console.log('mylittleurl:undelete - ' + item);

    // HttpDelete: http://<service>/api/littleurl/<key>
    // Set up http call
    const options = {
        method: 'POST',
        protocol: Protocol,
        host: ServiceAddressUri,
        path: '/api/littleurl/' + item,
    };

    // Call using net.request 
    const request = net.request(options);
    request.setHeader('Client-Secret', 'secretKey');
    request.on('response', (response) => {
        response.on('data', (body) => {
            console.log('undelete body: ' + body);

            if (response.statusCode >= 300) {
                console.log('error: ' + response.statusMessage);
                mainWindow.webContents.send('mylittleurl:error', response.statusMessage);
            }
            else {
                // Send event to display result
                var result = JSON.parse(body);
                console.log("UNDELETE Success: " + body);
                if(item === result.shortUrl){
                    // Load the listWindow HTML page in main window
                    loadList();
                }
            }
        });
    });
    request.end();
});

// List load is initiated from the main process
function loadList() {
    // HttpGet: http://<service>/api/littleurl/<key>
    const endPoint = Protocol + '//' + ServiceAddressUri + '/api/littleurl';
    console.log('Endpoint for loadList:' + endPoint);

    // Call using net.request 
    const request = net.request(endPoint);
    request.setHeader('Client-Secret', 'secretKey');
    request.on("response", (response) => {
        var result = "";
        response.on('data', (body) => {
            console.log('body: ' + body);
            console.log('onData:response.statusCode: ' + response.statusCode.toString(10));

            if (response.statusCode >= 300) {
                console.log('error: ' + response.statusMessage);
                mainWindow.webContents.send('mylittleurl:listerror', response.statusMessage);
            }
            else {
                // Wrap JSON array as proper JSON 
                result = '{ "results" : ' + body + '}';
            }
        });
        response.on('end', () => {
            console.log('Reponse ended');
            console.log('onEnd:response.statusCode: ' + response.statusCode.toString(10));
            // Send event to render page
            if (response.statusCode >= 300) {
                console.log('onEnd.error: ' + response.statusMessage);
                console.log('sending mylittleurl:listerror');
                mainWindow.webContents.send('mylittleurl:listerror', response.statusMessage);
            }
            else {
                mainWindow.webContents.on('did-finish-load', () => {
                    console.log('sending mylittleurl:showlist');
                    mainWindow.webContents.send('mylittleurl:showlist', result);
                    console.log('sent');            
                });
            }
        });
    });
    request.end();
    loadMainWindow('listWindow.html');

}

// Functions
function loadMainWindow(fileName) {
    // Load the html file
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, fileName),
        protocol: 'file:',
        slashes: true
    }));
}

function loadAboutWindow() {
    let aboutWindow = new BrowserWindow({
        height: 200, width: 400, alwaysOnTop: true,
        frame: false, modal: false,
        resizable: false, maximizable: false, minimizable: false, parent: mainWindow,
    });

    aboutWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'aboutWindow.html'),
        protocol: 'file:',
        slashes: true
    }));

    aboutWindow.webContents.on('before-input-event', (event, input) => {
        if ((input.key == 'Escape') || (input.code == 'KeyW' && (input.control || input.meta)))
            aboutWindow.close();
    });

    // mainWindow.backgroundColor = '#2e2c29';
    mainWindow.focusedWindow = false;
    mainWindow.setEnabled = false;
    //mainWindow.blurWebView();

    aboutWindow.on('close', () => {
        aboutWindow = null;
        mainWindow.setEnabled = true;
    })

    aboutWindow.flashFrame(true);
    // setTimeout(() => {
    //     aboutWindow.flashFrame(false);
    // }, 1000);
}

