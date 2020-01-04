"use strict";

// Basic component that displays resources as rows in a table
Vue.component('resource-display', {
    props: {
        res: { // Resource being displayed
            type: Object,
            default: () => ({})
        },
        showpercent: { // Boolean which determines if a resource's percentage until next increment is displayed
            type: Boolean
        }
    },
    template: `
    <tr>
        <td class="statRes">{{ res.name }}:</td>
        <td class="statRes">{{ res.format() }}</td>
        <td class="statRes" v-if="showpercent">{{ res.percentage() }}</td>
    </tr>
    ` 
});

// Component for showing admins on the admin page
Vue.component('admin-display', {
    props: {
        admin: { // Admin being displayed
            type: Object,
            deafult: () => ({})
        },
        index: { // Index of the admin in the server
            type: Number
        },
        changetask: { // If true, brings the user to the change task page for the admin
            type: Boolean
        }
    },
    template: `
    <tr>
        <td class="spaced">{{ admin.name }}<br /><div class="textSubtitleSmall">{{ TaskWorkingDescs[admin.task] }}</div></td>
        <td class="design">{{ Math.floor(admin.skills[0]) }}</td>
        <td class="client">{{ Math.floor(admin.skills[1]) }}</td>
        <td class="programming">{{ Math.floor(admin.skills[2]) }}</td>
        <td class="scripting">{{ Math.floor(admin.skills[3]) }}</td>
        <td><div class="element btn" v-on:click="data.goToTaskPage(index, $event)" v-if="changetask">Change Task</div></td>
    </tr>
    `
});

function setText(element, text) { // Sets text in an element
    if(element.innerHTML != text) element.innerHTML = text;
}

function showDiv(element) { // Shows an element
	element.style.display = "";
}

function hideDiv(element) { // Hides an element
	element.style.display = "none";
}

function addElement(root, type, ...classes) { // Adds any element to a root w/ classes
    let newDiv = document.createElement(type);
    for(let i = 0; i < classes.length; i++) newDiv.classList.add(classes[i]);
    root.append(newDiv);

    return newDiv;
}

function addDiv(root, ...classes) { // Adds a div to the screen to a root w/ classes
    return addElement(root, "div", ...classes);
}

function addToLog(message) { // Adds given message to the log, TODO add message flashes
    let entryMessage = addDiv(serverLog, "elementLeft", "message"); // Adds message

    setText(entryMessage, FormatTime(data.ticks) + " - " +message); // Sets message
    
    if(serverLog.children.length > 100) 
        serverLog.removeChild(serverLog.children[0]); // Removes messages if more than 100 exist
    
        serverLog.scrollTop = serverLog.scrollHeight; // Scrolls to bottom of box
}

// Log messages, different results equal different flashes in log
const Messages = {
    "POSITIVE": "GreenFlash2",
    "NEGATIVE": "RedFlash2"
}