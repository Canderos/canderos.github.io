"use strict";

// Saves the game, shoves all data into json then base64 then localstorage
function save() {
    let savegame = btoa(JSON.stringify(data._data)); // Grabs data and encodes in base64
    localStorage.setItem("save", savegame); // Saves item in localStorage
}

// Loads a savegame from local storage, done manually to preserve functions and other stuff
function load() {
    let savegame = JSON.parse(atob(localStorage.getItem("save"))); // Grabs save and decodes from base64

    data.money = savegame["money"]; // Sets money
    data.ticks = savegame["ticks"]; // Sets ticks
    
    data.servers = []; // Re-initializes server array
    data.currentServer = savegame["currentServer"]; // Sets current server

    let servers = savegame["servers"]; // Shorthand for servers in saved game
    for(let i = 0; i < servers.length; i++) { // Iterates through each saved server
        
        let sgs = savegame.servers[i]; // Shorthand for current savegame server

        data.servers.push(new Server(sgs["name"], sgs["type"], sgs["host"], sgs["firstVer"]));
        
        let cs = data.servers[i]; // Shorthand for current server

        // Iterates through each field in server object to load data
        // This is done to preserve functions and class structure
        for(let field in cs) {
            let selector = cs[field]; // Selected field in server
            
            if(selector instanceof Array) { // Meaning admin for now
                cs["admins"] = []; // Re-initializes admin array

                for(let j = 0; j < sgs["admins"].length; j++) { // Iterates through admins
                    let sga = sgs["admins"][j]; // Current savegame admin

                    cs["admins"].push(new Admin(sga.name, sga.specialty)); // Adds admin
                    
                    let ca = cs["admins"][j]; // Current admin
                    
                    ca["skills"] = sga["skills"]; // Overwrites skills, should be fine bc it's an array
                    ca["task"] = sga["task"]; // Overwrites task
                }
            }else if(selector instanceof Resource) selector.value = sgs[field]; // Sets value to relative field
            else selector = sgs[field]; // Sets field to field
        }
    }
}