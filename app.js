const Discord = require("discord.js")
const client = new Discord.Client()
const fs = require("fs")

const { prefix, token, storageFile } = require("./config.json")


const dayRef = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
const timeRef = ["AM", "PM"]
const patternRef = ["SS", "LS", "D", "F", "U"]

function getReportString(date) {
    let today = date.getDay()
    let hour = date.getHours()

    let reportString = dayRef[today]

    if (today !== 0) {
        if (hour < 12) {
            reportString += "AM"
        }
        else {
            reportString += "PM"
        }
    }
    return reportString
}

function readUserData() {
    let rawData = fs.readFileSync(storageFile)
    return JSON.parse(rawData)
}

function writeUserData(userDataObject, date) {
    userDataObject.lastUpdated = date
    let userDataJson = JSON.stringify(userDataObject, null, 4)
    fs.writeFileSync(storageFile, userDataJson)
}

function initializeNewUser(userName) {
    return {
        "userName": userName,
        "sun": "",
        "monAM": "",
        "monPM": "",
        "tueAM": "",
        "tuePM": "",
        "wedAM": "",
        "wedPM": "",
        "thuAM": "",
        "thuPM": "",
        "friAM": "",
        "friPM": "",
        "satAM": "",
        "satPM": "",
        "lastPattern": ""
    }
}


// when the client is ready, run this code
// this event will only trigger one time after logging in
client.once('ready', () => {
    console.log('Ready!')
    // FIXME: Check for data file and create if it doesn't exist
    client.user.setActivity('$help', { type: 'LISTENING' });
});


client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return

    const args = message.content.slice(prefix.length).trim().split(/ +/)
    const command = args.shift().toLowerCase()
    let date = new Date()

    // Allow users to report current or past turnip prices
    if (command === "report") {
        // FIXME: Create dedicated error file
        let reportUsageString =
            `\`\`\`${prefix}report usage:\n\n` +
            `  ${prefix}report [price]:\n    Record designated price for the current time period\n\n` +
            `  ${prefix}report [price] [day(3-letters)] [time(AM/PM)]:\n    Record price for the indicated period. Time can be omitted on Sundays.\n` +
            `\`\`\``

        if (!args.length) {
            return message.channel.send(reportUsageString)
        }
        else {
            // Check that price is a number between 0 and 999
            if (isNaN(args[0]) || args[0] < 0 || args[0] > 999) {
                return message.channel.send(
                    `Oh no! You did a bad thing, ${message.author.username}, but Turnip Stalker still loves and accepts you.\n` +
                    `Price must be a number between 0 and 999. Also, be sure you place the price before the time period, if needed.`
                )
            }
            else {
                let reportString = getReportString(date)
                if (args.length > 1 && typeof args[1] === "string" && dayRef.includes(args[1].toLowerCase())) {
                    reportString = args[1].toLowerCase()
                    if (args[1] !== "sun" && args.length > 2) {
                        if (typeof args[2] === "string" && timeRef.includes(args[2].toUpperCase())) {
                            reportString += args[2].toUpperCase()
                        }
                    }
                }

                let userData = readUserData()
                // console.log(`Checking if data for user ${message.author.id} exists...`)
                if (!(message.author.id in userData.users)) {
                    console.log(`Adding new user ${message.author.id}`)
                    userData.users[message.author.id] = initializeNewUser(message.author.username)
                }

                userData.users[message.author.id][reportString] = parseInt(args[0])
                writeUserData(userData, date)
                return message.channel.send(`Recorded price ${args[0]} for ${reportString}`)
            }
        }
    }

    // Allow users to report last week's pattern
    if (command === "pattern") {
        let patternUsageString =
            `\`\`\`${prefix}pattern usage:\n` +
            `  ${prefix}pattern [pattern type(SS, LS, D, F)]: Record last week's pattern` +
            `\`\`\``
        if (!args.length) {
            return message.channel.send(patternUsageString)
        }
        else if (typeof args[0] !== "string" || !(patternRef.includes(args[0].toUpperCase()))){
            return message.channel.send(
                `Turnip Stalker will always love you, ${message.author.username}, despite your many, many flaws.\n` +
                `Pattern must be \"SS\" (Small Spike), \"LS\" (Large Spike), \"D\" (Decreasing), \"F\" (Fluctuating), or \"U\" (Unknown)`
            )
        }
        else {
            let date = new Date()
            let userData = readUserData()
            if (!(message.author.id in userData.users)) {
                userData.users[message.author.id] = initializeNewUser(message.author.username)
            }
            userData.users[message.author.id]["lastPattern"] = args[0].toUpperCase()
            writeUserData(userData, date)

            return message.channel.send(`Recorded pattern ${args[0].toUpperCase()}`)
        }
    }

    // Get current reporting period
    else if (command === "period") {
        return message.channel.send(`\`\`\`Current reporting period is ${getReportString(date)}\`\`\``)
    }

    // Show all current data as a table
    else if (command === "prices") {
        let userData = readUserData()

        if (userData.users === {}) {
            return message.channel.send("User data is empty, much like Turnip Stalker's heart when he's not watching you")
        }

        let table =
            "\`\`\`" +
            "User           |Pattern|BuyAt|MonAM|MonPM|TueAM|TuePM|WedAM|WedPM|ThuAM|ThuPM|FriAM|FriPM|SatAM|SatPM\n" +
            "===============|=======|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====\n"

        let usernamePad = "               "
        let pricePad = "     "
        let patternPad = "       "



        for (const userId in userData.users) {
            let user = userData.users[userId]
            let userName

            if (user.userName.length < 15)
                userName = user.userName + usernamePad.slice(user.userName.length)
            else if (user.userName > 15){
                userName = user.userName.substr(0,15)
            }
            else {
                userName = user.userName
            }

            let pattern = user.lastPattern
            pattern = patternPad.slice(pattern.length) + pattern

            let buyAt = user.sun.toString()
            buyAt = pricePad.slice(buyAt.length) + buyAt
            
            let monAM = user.monAM.toString()
            monAM = pricePad.slice(monAM.length) + monAM
            let monPM = user.monPM.toString()
            monPM = pricePad.slice(monPM.length) + monPM
            
            let tueAM = user.tueAM.toString()
            tueAM = pricePad.slice(tueAM.length) + tueAM
            let tuePM = user.tuePM.toString()
            tuePM = pricePad.slice(tuePM.length) + tuePM

            let wedAM = user.wedAM.toString()
            wedAM = pricePad.slice(wedAM.length) + wedAM
            let wedPM = user.wedPM.toString()
            wedPM = pricePad.slice(wedPM.length) + wedPM

            let thuAM = user.thuAM.toString()
            thuAM = pricePad.slice(thuAM.length) + thuAM
            let thuPM = user.thuPM.toString()
            thuPM = pricePad.slice(thuPM.length) + thuPM

            let friAM = user.friAM.toString()
            friAM = pricePad.slice(friAM.length) + friAM
            let friPM = user.friPM.toString()
            friPM = pricePad.slice(friPM.length) + friPM

            let satAM = user.satAM.toString()
            satAM = pricePad.slice(satAM.length) + satAM
            let satPM = user.satPM.toString()
            satPM = pricePad.slice(satPM.length) + satPM

            let newTableLine =
                `${userName}|${pattern}|${buyAt}|${monAM}|${monPM}|${tueAM}|${tuePM}|${wedAM}|${wedPM}|${thuAM}|${thuPM}|${friAM}|${friPM}|${satAM}|${satPM}\n`

            table += newTableLine
        }

        table += "\`\`\`"

        return message.channel.send(table)
    }

    // Erases all stored user data
    else if (command === "reset") {
        return message.channel.send("In a perfect world, you and Turnip Stalker would be together for eternity, and this command would reset all values for all users for the week.\n Alas, we don't live in a perfect world.")
    }

    // Returns a list of commands
    else if (command === "help") {
        return message.channel.send(
            `\`\`\`` +
            `Commands for care and feeding of your friendly Turnip Stalker, who watches you sleep and loves you very much:\n` +
            `  ${prefix}report:  Record past/present turnip prices for the current week\n` +
            `  ${prefix}pattern: Record last week's price pattern\n` +
            `  ${prefix}prices:  Show a table of recorded prices for the week for all users\n` +
            `  ${prefix}period:  Show the current reporting period\n` +
            `  ${prefix}reset:   Clear all recorded values (Doesn't work yet)\n` +
            `  ${prefix}help:    You're looking at it, and it's looking at you\n` +
            `\`\`\``
        )
    }


});


// login to Discord with your app's token
client.login(token);
