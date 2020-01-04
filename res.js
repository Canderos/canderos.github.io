"use strict";

/*

Generic resource class used for tracking different game resoures.

*/

class Resource {
    constructor(name,      // Name of the resource being create
                value) {   // Initial value of the resource
        this.name = name;
        this.value = value;
    }
    
    format() { // Formats the resource for display on screen
        return Math.floor(this.value);
    }

    percentage() { // Gets the percentage towards the next full value
        let adj = (this.value - Math.floor(this.value)) * 100;
        return adj.toFixed(0) + "%";
    }

    toJSON() { // Custom JSON overwrite
        return this.value;
    }
}

/*

Class used to track leveled resources.
Used in resources which are not meant to increment normally.

m-value note: m-value is just a constant which is passed through with the update statement to modify an admin's skill progression by a set amount
why is it m? ask God

*/

class ProgressibleResource extends Resource {
    constructor(name,                            // Name of the resource being create
                value,                           // Initial value of the resource
                message,                         // Partial message that is displayed when the resource "levels"
                curve = () => 1,                 // Curve that the resource increases by
                updateHook = (a, s) => true) {   // Hook which is applied after value changes but before log is mentioned, takes admin and server
        super(name, value);
        
        this.message = message;
        this.curve = curve;
        this.updateHook = updateHook;
    }
    
    update(a,          // Admin which is used to access skill and exp
           s,          // Skill admin is using in progression
           m,          // m-value constant to use when admin gains xp
           server) {   // Server admin belongs to
        let prevVal = Math.floor(this.value); // Previous floored value of the resource
        let aSkill = Math.floor(a.skills[s]); // Gets admin skill being used, floored
        
        this.value += aSkill / this.curve(prevVal); // Internal value is incremented according to admin skill and internal curve

        let newSkill = a.skills[s] + (this.value / (m * (aSkill ** 2))); // New skill value
        Vue.set(a.skills, s, newSkill); // New skill value is set virtually

        // Runs if resource levels
        if(prevVal < Math.floor(this.value)) {
            if(this.updateHook(a, server)) // Runs only if updateHook allows it to do so and if server is active
                if(server.isActive) addToLog(this.name + " " + this.message + "!");
        }
    }
}

/*

Class used to generate admins which work on different elements of the servers
Four different admin skills exist, and their proficiencies are generated on admin creation

*/

class Admin {
    constructor(name,          // Name of the admin
                specialty) {   // Admin's specialty skill
        this.name = name;
        this.specialty = specialty;
        
        this.skills = [1.0, 1.0, 1.0, 1.0];
        for(let i = 0; i < 12; i++) { // Puts 12 points into random skills
            let randSkill = Math.floor(Math.random() * 4); // Picks random skill
            this.skills[randSkill]++;
        }
        
        this.skills[specialty] += 5; // Adds 5 to specialty
        this.task = Math.floor(Math.random() * 12); // Task randomly set
        if(this.task == 4 || this.task == 6 || this.task == 9) 
            this.task--; // Done to avoid admin initially working on task that might not be workable

        this.tempTask = this.task; // Var used when changing task
    }
    
    update(server) { Admin.updateProgress(this, server); } // Updater for admin, calls updateProgress function to update itself
    
    static updateProgress(admin,      // Admin being used in progressible resource update
                          server) {   // Server being targeted in update
        let skill; // Skill being trained
        let prevVal; // Previous value of the skill being used
        
        // Determines the type of skill being trained, helps to clear up clutter later
        if(admin.task <= Tasks.PRACTICEDRAW) skill = Skills.DESIGN;
        else if(admin.task <= Tasks.PRACTICECLIENT) skill = Skills.CLIENT;
        else if(admin.task <= Tasks.PRACTICESERVER) skill = Skills.PATCHING;
        else skill = Skills.SCRIPTING;
        
        prevVal = Math.floor(admin.skills[skill]); // Gets previous value of admin's skill

        let newSkill = -1; // Value used for skill updates within this function
        
        // Chooses resource to progress based on task.
        switch(admin.task) {
            case Tasks.REFBANNER:
                server.bannerRef.update(admin, skill, 150, server);
                break;

            case Tasks.VOTEBANNER:
                server.bannerVote.update(admin, skill, 150, server);
                break;

            case Tasks.DONATEBANNER:
                server.bannerDonate.update(admin, skill, 150, server);
                break;

            case Tasks.PRACTICEDRAW: // Special case where previous skill resources are used to progress skill faster
                newSkill = admin.skills[skill] + (Math.floor(server.bannerRef.value + server.bannerVote.value + server.bannerDonate.value) / (250 * (prevVal ** 2)));
                Vue.set(admin.skills, skill, newSkill);
                break;

            case Tasks.CRACKCLIENT:
                server.currClient.update(admin, skill, 150, server);
                break;

            case Tasks.PRACTICECLIENT:
                newSkill = admin.skills[skill] + (server.currClient.value / (250 * (prevVal ** 2)));
                Vue.set(admin.skills, skill, newSkill);
                break;

            case Tasks.REBOOT:
                server.outageWork.update(admin, skill, 20, server);
                break;

            case Tasks.CUSTOMCONTENT:
                server.customContent.update(admin, skill, 70, server);
                break;

            case Tasks.PRACTICESERVER:
                newSkill = admin.skills[skill] + (Math.floor(server.customContent.value) / (45 * (prevVal ** 2)));
                Vue.set(admin.skills, skill, newSkill);
                break;

            case Tasks.CREATENPC:
                server.currNPCs.update(admin, skill, 1200, server); // m-val might be a bit too high, look into later
                break;

            case Tasks.CREATEQUEST:
                server.quests.update(admin, skill, 70, server);
                break;

            case Tasks.PRACTICESCRIPT:
                newSkill = admin.skills[skill] + ((server.customContent.value + (10 * server.quests.value)) / (120 * (prevVal ** 2)));
                Vue.set(admin.skills, skill, newSkill);
        }
        
        if(prevVal < Math.floor(admin.skills[skill]) && server.isActive) {
            if(admin.name.slice(-1) != 's') addToLog(admin.name + "'s " + PStrings[skill]);
            else addToLog(admin.name + "' " + PStrings[skill]);
        }
    }
}

const Skills = {
    DESIGN: 0,
    CLIENT: 1,
    PATCHING: 2,
    SCRIPTING: 3
}

let PStrings = [
    "art improved!",
    "client skills went up!",
    "programming improved!",
    "scripting improved!"
];

const Tasks = {
    REFBANNER: 0,
    VOTEBANNER: 1,
    DONATEBANNER: 2,
    PRACTICEDRAW: 3,
    CRACKCLIENT: 4,
    PRACTICECLIENT: 5,
    REBOOT: 6,
    CUSTOMCONTENT: 7,
    PRACTICESERVER: 8,
    CREATENPC: 9,
    CREATEQUEST: 10,
    PRACTICESCRIPT: 11
}

const TaskWorkingDescs = { // Task descriptions placed under admins when working
    0: "Improving Referral banner",
    1: "Improving Vote banner",
    2: "Improving Donate banner",
    3: "Doodling",
    4: "Cracking newer client",
    5: "Hex editing",
    6: "Rebooting game server",
    7: "Adding custom content",
    8: "Fiddling with the source",
    9: "Scripting missing NPCs",
    10: "Scripting a custom quest",
    11: "Scripting for fun"
}

const TaskChooseDescs = { // Descriptions used for tasks when choosing them
    0: "Improve Referral banner",
    1: "Improve Vote banner",
    2: "Improve Donate banner",
    3: "Doodle (Practice Design)",
    4: "Crack newer client",
    5: "Hex Edit (practice Client)",
    6: "Reboot game server",
    7: "Add source patches",
    8: "Fiddle (practice Server)",
    9: "Script missing NPCs",
    10: "Script custom quests",
    11: "Script for fun (practice Scripting)"
}

const Hosts = {
    HAMACHI: 0,
    HAMACHI2: 1,
    MSTAR: 2,
    VPS: 3,
    INTERWEB: 4,
    SILVER: 5,
    COMMERCIAL: 6,
    INDUSTECH: 7,
    SUPER: 8
}

const HostFields = {
    NAME: 0,
    MAX: 1,
    UPTIME: 2,
    COST: 3
}

let _hosts = [
    ["Hamachi (your old laptop)", 20, 70, 0],
    ["Hamachi (friend's PC)", 40, 80, 10],
    ["M****Host", 75, 85, 30],
    ["VPS Solutions", 100, 90, 55],
    ["InterWeb Servers", 125, 92, 70],
    ["Silver Enterprise Hosting", 175, 95, 95],
    ["Commercial Servers", 225, 96, 125],
    ["IndusTech Infrastructure", 300, 97, 170],
    ["The Super Thing", 500, 98, 240]
];

Object.freeze(PStrings);
Object.freeze(_hosts);