"use strict";

/*

Main class which holds the seperate server instances.
Class contain all variables and functions relating to a server and what it does on update.

*/

class Server {
    constructor(name,         // Name of the server
                type,         // The type of server
                firstHost,    // First host initially used to run the server
                firstVer) {   // First version for the server to start on
        this.name = name;
        
        this.host = firstHost;
        this.type = type;
        this.tempHost = firstHost;
        this.tempAdmin = 0; // Temporary value held for changing admin tasks
        this.hostDays = 30; // Hosts last for 30 days before they need to be renewed, so a base value of 30 is set

        this.users = new Resource("Users", 50); // Number of users registered
        this.currLogins = 0; // Number of users currently logged in
        this.isOnline = true; // Controls if server is online or not

        this.isActive = false; // Boolean used to determine if statements are sent to the log, initially false

        // Donation statistics
        this.donatorsMonth = 0; // Donators in # of people
        this.donatorsAllTime = 0;
        this.donationsMonth = 0; // Donations in $
        this.donationsAllTime = 0;
        this.averageDonationsMonth = 0; // Average of donations
        this.averageDonationsAllTime = 0;

        this.donorPerk = 0; // Perk which encourages users to donate
        this.advertisement = 0; // Perk which increases popularity

        // Initialzes and creates admin array, admins are updated per server tick
        this.admins = [];
        this.admins.push(new Admin("Canderos", Skills.DESIGN));
        this.admins.push(new Admin("Kreming", Skills.SCRIPTING));
        this.admins.push(new Admin("SeaChicken", Skills.PATCHING));

        this.popularity = new Resource("Popularity", 50); // Popularity of the server, used in getting people to join
        this.reputation = new Resource("Reputation", 50); // Reputation of the server, used in getting people to join and player retention
        this.fun = new Resource("Fun", 75); // Fun value of the server, used in a few things idr what tho and im not gonna update this later

        this.bannerRef = new ProgressibleResource("Referral", 1, "beautified", (v) => (v ** 2) * 75); // Referral banner, helps to attract new users
        this.bannerVote = new ProgressibleResource("Vote", 1, "beautified", (v) => (v ** 2) * 75); // Vote banner, used to attract new users by way of voting sites
        this.bannerDonate = new ProgressibleResource("Donate", 1, "beautified", (v) => (v ** 2) * 75); // Donation banner, used to encourage more users to donate

        this.firstVer = firstVer; // First version of the server
        this.officialClient = new Resource("Official", firstVer + 1); // Current version of the client officially
        this.currClient = new ProgressibleResource(this.name, 1, "cracked", (v) => (v ** 2) * 75, function(a, s) { // Current version of private server client, cannot be larger than the current official version
            s.fun.value += 5;
            s.reputation.value += 5;

            if(s.isActive) addToLog("v." + Math.floor(this.value + this.firstVer) + " " + this.message + "!");
            if((this.value + this.firstVer) >= s.officialClient.value) a.task = Tasks.PRACTICECLIENT; // Reassigns task if server is fully caught up

            return false; // Stops other message from being printed
        });

        this.currClient.firstVer = firstVer; // Sets first version of current client, used later so calculations don't get fucked
        this.currClient.format = function() { return Math.floor(this.value) + this.firstVer; } // Fixes formatter so it works properly

        this.clientTime = (Math.floor(Math.random() * 20) + 20) * 120; // Server ticks until next version of the client drops, roughly 30 days
        this.clientTimeWait = 0; // Honestly don't know how to describe this but it's used
        
        this.outageWork = new ProgressibleResource("int_outage_work", 0, this.name + " is online."); // Work needed to reboot server if it does go offline
        this.outageWork.update = function(a, s, m, server) { // Update function overwritten bc it works differently
            let aSkill = Math.floor(a.skills[s]);
            
            this.value -= aSkill;
            let newSkill = (a.skills[s] + 1 / (m * (aSkill ** 2)));

            Vue.set(a.skills, s, newSkill);

            if(this.value < 0) { // If value is below 0, server should be rebooted
                server.isOnline = true;
                if(server.isActive) addToLog(this.message);
                a.task = Tasks.PRACTICESERVER;
            }
        }
        
        this.quests = new ProgressibleResource("Custom Quests", 1, "scripted", (v) => (v ** 2) * 1000, function(a, s) { // Custom quests for the server, used for stat boosts
            s.fun.value += 4;
            return true;
        });

        this.customContent = new ProgressibleResource("Custom Content", 10, "added", (v) => 80 * (v + 1), function(a, s) { // Custom content for the server, used for small stat boosts
            s.fun.value++; 
            s.reputation.value += 0.75;
            return true;
        });

        this.officialNPCs = new Resource("Official", 250); // Number of NPCs in the official version of the game
        this.currNPCs = new ProgressibleResource(this.name, 150, "scripted", (v) => 200, function(a, s) { // Number of NPCs in the private server, cannot be more than official
            s.reputation.value += 0.1; 
            s.fun.value += 0.1;

            if(this.value >= s.officialNPCs.value) a.task = Tasks.PRACTICESCRIPT;
            addToLog("Custom NPC " + this.message + "!");
            return false;
        });
    }

    // Updater for servers, runs every server tick
    update() {
        callInList(this.admins, "update", this); // Updates all admins

        // Updates different parts of the server
        Server.patchTick(this);

        Server.eventLeave(this);
        Server.eventJoin(this);
        Server.setCurrLogins(this);

        Server.eventOnline(this);
        Server.eventDonation(this);
        Server.eventDonorPopularity(this);
        Server.eventAdPopularity(this);
        Server.eventAdReputaiton(this);
        
        if(this.isOnline) Server.eventInstability(this);
    }

    updateDaily() {
        Server.hostTick(this);
    }

    updateMonthly() {
        this.donatorsMonth = 0; // Clears this stuff
        this.donationsMonth = 0;
    }

    // Functions below are used in updates, static because they don't need to be instanced

    // Tick updates
    static patchTick(server) {
        server.clientTime--;
        
        if(server.clientTime > 0) {
            server.clientTimeWait++;
            if(server.clientTimeWait > 119) { // fix this?
                if(server.clientTime / 120 < 8) if(server.isActive) addToLog("Official Client v." + (server.officialClient.value + 1) + " coming in " + Math.ceil(server.clientTime / 120) + " days.");
                server.clientTimeWait = 0;
            }
        }else {
            server.clientTime = (Math.floor(Math.random() * 20) + 20) * 120;
            server.officialClient.value++;
            server.officialNPCs.value += Math.floor(Math.random() * 30);
            if(server.isActive) addToLog("Official Client v." + server.officialClient.value + " released!", Messages.POSITIVE);
        }
    }

    static eventOnline(server) {
        if(server.isOnline) {
            server.reputation.value += server.fun.value / 10000;
            server.fun.value += 0.001;
        }else {
            server.reputation.value -= 0.05;
            server.fun.value -= 0.01;
        }
    }

    static eventDonation(server) {
        let metricFun = 1000 - (1000 / Math.max(1, server.fun.value));
        let metricBanner = 600 - (600 / Math.pow(server.bannerDonate.value, 2));
        let metricUser = 600 - (600 / Math.max(1, server.users.value));
        let metricPerk = 250 * server.donorPerk;
        if(server.donorPerk == 4) metricPerk += 250;
        let rand = Math.random() * 15;
        
        let overallMetric = 4200 - metricFun - metricBanner - metricUser - metricPerk; // Big boy metric
        if((rand / Math.max(6, server.currLogins)) < (1 / overallMetric)) { // If overallMetric is more donation occurs
            // TODO donor GMs
            let donation = Math.floor((Math.random() * 800) + 150) / 100;
            
            data.money.value += donation;
            server.donationsMonth += donation;
            server.donationsAllTime += donation;
            server.donatorsMonth++;
            server.donatorsAllTime++;
            
            if(server.isActive) addToLog("Received $" + donation + " donation.", Messages.POSITIVE);
        }
    }
    
    static eventDonorPopularity(server) {
        switch(server.donorPerk) {
            case DonorPerks.FORUM: 
                server.reputation.value += 0.002;
                break;
                
            case DonorPerks.CASH: 
                server.reputation.value -= 0.005;
                break;
                
            case DonorPerks.RARE: 
                server.reputation.value -= 0.018;
                break;
                
            case DonorPerks.ADMIN: 
                server.reputation.value -= 0.04;
                break;
                
            default: 
                server.reputation.value += 0.005;
        }
    }
    
    static eventAdPopularity(server) { // TODO make a thing here
        switch(server.advertisement) {
            case Advertisements.FORUM:
                server.popularity.value += ((0.0001 * server.users.value) * Math.floor(server.bannerRef.value));
            
            case Advertisements.AD:
                server.popularity.value += ((0.00025 * server.users.value) * Math.floor(server.bannerRef.value));
            
            case Advertisements.SPAM:
                server.popularity.value += ((0.00075 * server.users.value) * Math.floor(server.bannerRef.value));
            
            default:
                server.popularity.value += (0.0001 * server.users.value);
        }
    }
    
    static eventAdReputaiton(server) {
        switch(server.advertisement) {
            case Advertisements.FORUM:
                server.reputation.value += 0.002 * Math.floor(server.bannerRef.value);
            
            case Advertisements.AD:
                server.reputation.value += (0.003 * Math.floor(server.bannerRef.value)) - 0.01;
            
            case Advertisements.SPAM:
                server.reputation.value += (0.002 * Math.floor(server.bannerRef.value)) - 0.04;
            
            default:
                server.reputation.value += 0.001;
        }
    }
    
    static eventJoin(server) {
        if(server.popularity.value > server.users.value) {
            let populationMetric = 300 - (300 / (0.2 * server.popularity.value));
            let reputationMetric = Math.max(600, 5 * (server.reputation.value - server.users.value));
            let funMetric = 250 - (300 / Math.min(3, Math.abs(server.fun.value / 20)));
            let joinMetric = (1200 - reputationMetric - funMetric - populationMetric) / 4;
            if(joinMetric < 0) joinMetric = 15;
        
            if((Math.random() < (1 / joinMetric)) && server.fun.value > 0) {
                server.users.value++;
                if(server.isActive) addToLog("A new member joins.", Messages.POSITIVE);
            }
        }
    }
    
    static eventLeave(server) {
        if(server.users.value > server.fun.value) {
            if(Math.random() < ((server.users.value - server.fun.value) / 2000)) {
                if(server.users.value > 0) {
                    server.users.value--;
                    server.popularity.value -= 0.2;
                    if(server.isActive) addToLog("Player quit " + server.name + ".", Messages.NEGATIVE);
                }else server.popularity.value -= 0.6;
            }
        }
    }
    
    static setCurrLogins(server) {
        if(server.isOnline) {
            let pLogs = Server.getPeakLogins(Math.floor(data.ticks / 150) % 24);
            pLogs = Math.floor((server.users.value * pLogs) / 100);
            let cLogs = (pLogs * Math.sqrt(Math.random())) + 0.4;
            cLogs = ((cLogs - server.currLogins) / 4) + server.currLogins;
            server.currLogins = Math.round(Math.min(cLogs, _hosts[server.host][HostFields.MAX]));
        }else server.currLogins = 0;
    }
    
    static getPeakLogins(hours) {
        switch(Math.floor(hours / 3)) {
            case 0:
                return 40;
            
            case 1:
                return 30;
            
            case 2:
                return 35;
            
            case 3:
                return 40;
            
            case 4:
                return 60;
            
            case 5:
                return 80;
            
            case 6:
                return 100;
            
            case 7:
                return 90;
            
            default:
                return 0;
        }
    }
    
    static eventInstability(server) {
        if((Math.random() * 100) > _hosts[server.host][HostFields.UPTIME]) { // If rand is more than uptime, sadtimes time
            let chaos = Math.random();
            
            if(chaos > 0.992) { // ULTRA SAD TIMES
                if(server.isActive) addToLog("Server crashed.", Messages.NEGATIVE);
                server.isOnline = false;
                server.currLogins = 0;
                server.outageWork.value = (Math.random() * 200) + 200; // Work needed to restore server
            }else if(chaos > 0.92 && server.currLogins > 0) { // Sorta sad but more bad times
                if(server.isActive) addToLog("User disconnected.", Messages.NEGATIVE);
                server.currLogins -= 1;
                server.fun.value -= 0.05;
            }
        }
    }
    
    // Daily updates
    static hostTick(server) {
        if(server.hostDays > 0) {
            server.hostDays--;
            if(server.hostDays == 0) {
                server.isOnline = false;
                server.currLogins = 0;
                if(server.isActive) addToLog("Hosting expired.", Messages.NEGATIVE);
                if(server.isActive) addToLog("Server disconnected.", Messages.NEGATIVE);
            }else if(server.hostDays < 6) if(server.isActive) addToLog("Hosting expires in " + server.hostDays + " days.");
        }
    }

}

const DonorPerks = {
    NONE: 0,
    FORUM: 1,
    CASH: 2,
    RARE: 3,
    ADMIN: 4
}

const DonorPerksAnti = {
    0: "No advantage",
    1: "Forum status",
    2: "Premium cosmetics",
    3: "Rare weapons",
    4: "Admin status"
}

const Advertisements = {
    MOUTH: 0,
    FORUM: 1,
    AD: 2,
    SPAM: 3
}

const AdvertAnti = {
    0: "Word of mouth",
    1: "Forum signatures",
    2: "Advertisements",
    3: "Forum spam"
}

const Types = {
    MAPLESTORY: 'MapleStory',
    RUNESCAPE: 'RuneScape'
}