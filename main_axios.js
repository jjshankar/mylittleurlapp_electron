const electron = require('electron');
const url = require('url');
const path = require('path');

// Uses AXIOS API Helper
const APPNAME = 'MyLittleURL (axios)'
const apiHelper = require('./apiHelper_axios');

// Public site address for prefix
const BaseAddressPrefix = 'http://mylittleurl.us/';

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
});


// Listen for mylittleurl:add event
ipcMain.on('mylittleurl:add', (event, item) => {
    console.log('mylittleurl:add - ' + item);

    // Add new URL and get result from REST API
    apiHelper.addUrl(item)
        .then(result => {
            console.log('addUrl result: ' + result);

            // Calc reudction pct
            const shortUrl = BaseAddressPrefix + result.shortUrl;
            reductionPct = 100 * (result.longUrl.length - shortUrl.length) / result.longUrl.length;
            console.log('reductionPct = ' + reductionPct.toFixed(2));

            // Send event to display result
            mainWindow.webContents.send('mylittleurl:show', shortUrl, reductionPct.toFixed(2));
        })
        .catch(err => {
            // Send error to renderer
            console.log('CAUGHT: ' + err);
            if (err.response) {
                console.log("ERROR RESP:" + err.response.data);
                mainWindow.webContents.send('mylittleurl:error', err.response.data);
            }
            else {
                console.log("ERROR MESSAGE:" + err.message);
                mainWindow.webContents.send('mylittleurl:error', err.message);
            }
        });
})

// Listen for mylittleurl:fetch event
ipcMain.on('mylittleurl:fetch', (event, item) => {
    console.log('mylittleurl:fetch - ' + item);

    if (item.toLocaleLowerCase().startsWith(BaseAddressPrefix)) {
        console.log('Invalid attempt.');
        mainWindow.webContents.send('mylittleurl:error', 'Invalid attempt.  This is already a LittleURL.');

    }
    else {
        // Get result from REST API
        apiHelper.getUrlByKey(item)
            .then(result => {
                console.log('getUrlByKey result: ' + result);

                // Send event to display result
                console.log("SENDING: " + result);
                mainWindow.webContents.send('mylittleurl:result', result);
            })
            .catch(err => {
                // Send error to renderer
                console.log('CAUGHT: ' + err);
                if (err.response) {
                    console.log("ERROR RESP:" + err.response.data);
                    mainWindow.webContents.send('mylittleurl:error', err.response.data);
                }
                else {
                    console.log("ERROR MESSAGE:" + err.message);
                    mainWindow.webContents.send('mylittleurl:error', err.message);
                }
            });
    }
});

// List load is initiated from the main process
function loadList() {
    // Call API
    apiHelper.getAllUrls()
        .then(result => {
            //console.log('getAllUrls result: ' + result);

            // Send event to render page
            mainWindow.webContents.on('did-finish-load', () => {
                console.log('sending mylittleurl:showlist');
                mainWindow.webContents.send('mylittleurl:showlist', result);
                console.log('sent');
            });
        })
        .catch(err => {
            // Fail silently
            console.log('CAUGHT: ' + err);
        });
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
        frame: false,
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

    mainWindow.focusedWindow = false;
    aboutWindow.on('close', () => {
        aboutWindow = null;
    })

}
