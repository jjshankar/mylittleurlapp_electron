const electron = require('electron');
const url = require('url');
const path = require('path');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// USES NATIVE XmlHttpRequest 
const APPNAME = 'MyLittleURL (xhr)'

// REST API 
const ServiceAddressUri = 'http://localhost:32780/';        // When debugging this app on localhost (API & mongodb in docker)
const BaseAddressPrefix = 'http://mylittleurl.us/';        // Public site address for prefix


const { app, BrowserWindow, Menu, ipcMain, shell } = electron;

let mainWindow;

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
                    loadMainWindow('listWindow.html');
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
    mainWindow = new BrowserWindow({});
    loadMainWindow('mainWindow.html');

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on('onFocus', () => {
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
        const endPoint = ServiceAddressUri + 'api/littleurl';
        console.log(endPoint);

        const payload = '{ LongUrl : ' + item + '}';

        // Add new URL and get result from REST API
        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", () => {
            // HttpStatus 201 => created
            if (oReq.status === 201) {
                console.log('addUrl result: ' + oReq.responseText);

                // Parse JSON
                var result = JSON.parse(oReq.responseText);

                // Calc reudction pct
                const shortUrl = BaseAddressPrefix + result.shortUrl;
                reductionPct = 100 * (result.longUrl.length - shortUrl.length) / result.longUrl.length;
                console.log('reductionPct = ' + reductionPct.toFixed(2));

                // Send event to display result
                mainWindow.webContents.send('mylittleurl:show', shortUrl, reductionPct.toFixed(2));
            }
            else {
                console.log('ERROR: ' + oReq.status);
                mainWindow.webContents.send('mylittleurl:show', oReq.statusText);
            }
        });
        oReq.open("POST", endPoint);
        oReq.setRequestHeader('Content-Type', 'application/json');
        oReq.send(JSON.stringify({ LongUrl: item }));
    }
})

// Listen for mylittleurl:fetch event
ipcMain.on('mylittleurl:fetch', (event, item) => {
    console.log('mylittleurl:fetch - ' + item);

    // HttpGet: http://<service>/api/littleurl/<key>
    const endPoint = ServiceAddressUri + 'api/littleurl/' + item;
    console.log(endPoint);

    // Get result from REST API
    var oReq = new XMLHttpRequest();
    oReq.addEventListener("readystatechange", () => {
        console.log('getUrlByKey result: ' + oReq.responseText);
        if (oReq.readyState === 4) {
            if (oReq.status === 200) {
                // Send event to display result
                var result = JSON.parse(oReq.responseText);
                mainWindow.webContents.send('mylittleurl:result', result.longUrl);
            }
            else {
                console.log('STATUS: ' + oReq.status);
                mainWindow.webContents.send('mylittleurl:error', oReq.responseText);
            }
        }
    });
    oReq.open("GET", endPoint);
    oReq.send();
});

// List load is initiated from the main process
function loadList() {
    // HttpGet: http://<service>/api/littleurl
    const endPoint = ServiceAddressUri + 'api/littleurl';
    console.log(endPoint);

    // Get result from REST API
    var oReq = new XMLHttpRequest();
    var result;

    oReq.addEventListener("load", () => {
        if (oReq.status === 200) {
            console.log('getUrlList result: ' + oReq.responseText);

            // Wrap JSON array as proper JSON 
            result = '{ "results" : ' + oReq.responseText + '}';

            // Send event to render page
            mainWindow.webContents.on('did-finish-load', () => {
                console.log('sending mylittleurl:showlist');
                mainWindow.webContents.send('mylittleurl:showlist', result);
                console.log('sent');
            });
        }
        else {
            console.log('ERROR: ' + oReq.statusText);
        }
    });
    oReq.open("GET", endPoint);
    oReq.send();
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

