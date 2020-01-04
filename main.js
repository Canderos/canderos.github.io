"use strict";

let data = new Vue({ // Main data class
    el: "#root", // Based on root
    data: {
        servers: [new Server("Test Server", Types.MAPLESTORY, Hosts.HAMACHI, 50)],/*new Server("Test Server 2", Types.RUNESCAPE, Hosts.HAMACHI, 365)],*/
        money: new Resource("Money", 100),
        currentServer: 0,
        ticks: 0
    },

    methods: {
        changeServer(newServer) { // Changes currently active server, takes ID of new server
            for(let i = 0; i < this.servers.length; i++) this.servers[i].isActive = false; // Sets all servers to false
            this.servers[newServer].isActive = true; // Sets specific server to active

            // Removes all log messages on server change
            var e = serverLog.lastElementChild;
            while(e) {
                serverLog.removeChild(e);
                e = serverLog.lastElementChild;
            }

            this.currentServer = newServer; // Changes visible data to that of the new server
        },

        changeServerpage(selectedPage) { // Changes the current serverpage
            let pages = [adminPage, hostPage, userPage, taskPage];
            for(let i = 0; i < pages.length; i++) hideDiv(pages[i]); // Hides all pages
            showDiv(pages[selectedPage]); // Shows the selected page
        },

        goToTaskPage(index, event) { // Sets temp admin and goes to task page
            this.servers[this.currentServer].tempAdmin = index; // Sets temp index to admin
            this.selectTask(this.servers[this.currentServer].admins[index].task, event); // Sets currently selected task to current task
            this.changeServerpage(3); // Changes page to task page
        },

        selectTask(task, event) { // Changes task to be the one which is currently selected 
            let cs = this.servers[this.currentServer];
            if(!event.target.classList.contains("btnDisabled")) cs.admins[cs.tempAdmin].tempTask = task; // Assigns temporary task
            
            updateTaskButtons();
        },

        changeTask() { // Changes the admin's task
            let cs = this.servers[this.currentServer];
            cs.admins[cs.tempAdmin].task = cs.admins[cs.tempAdmin].tempTask; // Sets admin's task to new task
            cs.tempAdmin = 0; // Done to stop things from bad

            this.changeServerpage(0); // Goes back to admin page
        },

        changeServerHost(host, event) { // Changes server host
            if(!event.target.classList.contains("btnDisabled")) this.servers[this.currentServer].tempHost = host;

            updateChangeHost() // Big boy button updated here because there's no need to constantly update it for now
        },

        renewHosting() { // Renews (or changes) server hosting
            let cs = this.servers[this.currentServer];
            if(_hosts[cs.tempHost][HostFields.COST] <= this.money.value) { // Only purchasable if enough moeny
                this.money.value -= _hosts[cs.tempHost][HostFields.COST]; // Money subtracted

                if(cs.host != cs.tempHost) cs.hostDays = 30; // Days are renewed to 30 if host is changed
                else cs.hostDays += 30; // 30 days are added if host is the same

                cs.host = cs.tempHost; // Sets host
            }
        },

        dropPerk(type) { // Toggles the dropdown menus for donation perks and advertisements
            if(type == 0) dropDonate.classList.toggle("show");
            else dropRef.classList.toggle("show");
        }
    },

    created() { // init
        this.servers[0].isActive = true; // Sets first server to active
        this.currentServer = 0;
        this.changeServerpage(2); // Autoclicks admin page

        this.money.format = function() { return "$" + this.value.toFixed(2); } // Fixes money

        initHostTable();
        initAdminTasksTable();
    },

    mounted() { // post-init
        setInterval(update, 1000 / 30); // Game elements update tickrate times per second, 30 is fps and can be changed
        setInterval(updateUI, 1000 / 60);
    }
});

function initHostTable() { // Initializes the host table so i don't have to mess with it when I add more hosts, theres probably an easier way to do this w/ vue but w/e
    for(let i = 0; i < _hosts.length; i++) {
        let nextRow = addElement(hostTable, "tr", "row" + i);
        let btn = addElement(nextRow, "td", "element", "btn", "hostBtn"); // Button which selects the server
        btn.setAttribute("v-on:click", "changeServerHost(" + i + ", $event)"); // Makes onclick change temporary host
        setText(btn, "&nbsp&nbsp&nbsp"); // Spaces out button interior

        for(let j = 0; j < _hosts[i].length; j++) { // Elements
            if(j == 2) addElement(nextRow, "td", "rowElement" + j).innerHTML = _hosts[i][j] + "%"; // Uptime, is treated as a %
            else if(j == 3) addElement(nextRow, "td", "rowElement" + j).innerHTML = "$" + _hosts[i][j]; // Money per month
            else addElement(nextRow, "td", "rowElement" + j).innerHTML = _hosts[i][j]; // Everything else
        }
    }
}

function initAdminTasksTable() { // Initializes the admin tasks tables brooooo
    initTaskTable(designTable, 0, Tasks.CRACKCLIENT, "design");
    initTaskTable(clientTable, Tasks.CRACKCLIENT, Tasks.REBOOT, "client");
    initTaskTable(programmingTable, Tasks.REBOOT, Tasks.CREATENPC, "programming");
    initTaskTable(scriptingTable, Tasks.CREATENPC, Tasks.PRACTICESCRIPT + 1, "scripting");
}

function initTaskTable(tableID, start, end, classType) { // Inits a specific table
    for(let i = start; i < end; i++) {
        let nextRow = addElement(tableID, "tr", "row" + i);
        let btn = addElement(nextRow, "td", "element", "btn", "taskBtn"); // Button which selects the task
        btn.setAttribute("v-on:click", "selectTask(" + i + ", $event)"); // Makes onclick change temporary host
        setText(btn, "&nbsp&nbsp&nbsp"); // Spaces out button interior

        let taskDesc = addElement(nextRow, "td", "element", classType);
        taskDesc.innerHTML = TaskChooseDescs[i]; // Sets text to the correct description
    }
}

function updateTaskButtons() { // Updates the status of task buttons every tick
    let btns = document.getElementsByClassName("taskBtn"); // All task buttons
    let cs = data.servers[data.currentServer];

    for(let i = 0; i < btns.length; i++) {
        if(i != cs.admins[cs.tempAdmin].tempTask) {
            if(i == 4 && (cs.currClient.value + cs.firstVer) >= cs.officialClient.value) { // Disables cracking button if current version is fine
                btns[i].classList.add("btnDisabled");
                btns[i].classList.remove("btnDeselected");
            }else if(i == 6 && cs.isOnline) { // Disables rebooting server if server is online
                btns[i].classList.add("btnDisabled");
                btns[i].classList.remove("btnDeselected");
            }else if(i == 9 && cs.currNPCs.value >= cs.officialNPCs.value) { // Disables adding NPCs if cap is hit
                btns[i].classList.add("btnDisabled");
                btns[i].classList.remove("btnDeselected");
            }else { // Deselects button
                btns[i].classList.add("btnDeselected");
                btns[i].classList.remove("btnDisabled");
            }
        }else { // Task selected is good
            btns[i].classList.remove("btnDeselected");
            btns[i].classList.remove("btnDisabled");
        }
    }
}

function updateHostButtons() { // Updates host button activity every tick
    let btns = document.getElementsByClassName("hostBtn"); // Grabs all host buttons

    for(let i = 0; i < btns.length; i++) {
        if(i != data.servers[data.currentServer].tempHost) {
            if(data.money.value < _hosts[i][HostFields.COST] && i != data.servers[data.currentServer].host) { // Disables button if not enough money or not current host
                btns[i].classList.add("btnDisabled");
                btns[i].classList.remove("btnDeselected");
            }
            else { // Shows button as deselected if enough money for it and not selected
                btns[i].classList.add("btnDeselected");
                btns[i].classList.remove("btnDisabled");
            }
        }else { // Shows button as selected
            btns[i].classList.remove("btnDeselected");
            btns[i].classList.remove("btnDisabled");
        }
    }
}

function updateChangeHost() { // Updates the change host button
    let cs = data.servers[data.currentServer];
    if(cs.host != cs.tempHost) {
        changeHost.classList.add("btnChanged");
        setText(changeHost, "Switch to new host (remaining time will not be reimbursed)");
    }else {
        changeHost.classList.remove("btnChanged");
        setText(changeHost, "Renew hosting for 1 month");
    }
}

function update() {
    data.ticks += 30; // TODO change back to 1
    if(data.ticks % 30 == 0) callInList(data.servers, "update");
    if(data.ticks % 3600 == 0) {
        callInList(data.servers, "updateDaily");
    }
    if(data.ticks % 108000 == 0) callInList(data.servers, "updateMonthly");
}

function updateUI() {
    updateHostButtons();
    updateChangeHost();
    updateTaskButtons();
}

// Calls a specific function on an item with given parameters
function callInList(list, func, ...params) {
    for(let item in list) {
        if(list[item][func]) list[item][func](...params);
    }
}

window.onclick = function(event) { // Used to hide dropdown menus if not clicked
    if(!event.target.matches('#donateBox') && dropDonate.classList.contains('show')) dropDonate.classList.remove('show');
    else if(!event.target.matches('#refBox') && dropRef.classList.contains('show')) dropRef.classList.remove('show');
  }

// Formats time in MM/DD hh:mm (AM/PM)
function FormatTime(v) {
    let month = Math.floor(v / 108000) % 12; // Calculates month
    let day = Math.floor(v / 3600) % 30; // Calculates day
    let hour = Math.floor(v / 150) % 24; // Calculates hour
    if(hour == 0) hour = 24; // Sets the thing at the end
    let post = (hour > 11 && hour < 24) ? "PM" : "AM";
    
    if(hour > 12) hour -= 12; // Normalizes hour
    
    return (month + 1) + "/" + (day + 1) + " " + hour + ":00 " + post; // Final string
}

// Adds a year to the time formatter Year Y, MM/DD hh:mm (AM/PM)
function FormatTimeFull(v) {
    let year = Math.floor(v / 1296000); // Gets year
    
    return "Year " + (year + 1) + ", " + FormatTime(v); // Adds it all together
}