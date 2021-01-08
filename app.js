const Discord = require("discord.js")
const client = new Discord.Client()
const fs = require("fs")
const Predictor = require("./predictions");

// TODO: Auto-create default config/storage if missing
const { prefix, token, storageFile, admins } = require("./config.json")


const dayRef = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
const timeRef = ["AM", "PM"]
const patternRef = ["SS", "LS", "D", "F", "U"]
const patternToInt = {
    F: 0,
    LS: 1,
    D: 2,
    SS: 3,
    U: 4,
    "": 4
};

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

function initializePrices(pattern = "U") {
    return {
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
        "lastPattern": pattern,
        "predictions": {
            "SS": "",
            "LS": "",
            "D": "",
            "F": "",
            "min": "",
            "max": ""
        }
    }
}

function initializeNewUser(userName) {
    return {
        "userName": userName,
        "prices": initializePrices(),
        "events": "",
        "isOpen": false
    }
}

function convertPercentage(fraction) {
  if (Number.isFinite(fraction)) {
    let percent = fraction * 100;
    if (percent >= 1) {
      return percent.toPrecision(3)
    } else if (percent >= 0.01) {
      return percent.toFixed(2)
    } else {
      return '<0.01';
    }
  } else {
    return ""
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
        if (!args.length) {
            let reportUsageString =
            `\`\`\`${prefix}report usage:\n\n` +
            `  ${prefix}report [price]:\n    Record designated price for the current time period\n\n` +
            `  ${prefix}report [price] [day(3-letters)] [time(AM/PM)]:\n    Record price for the indicated period. Time can be omitted on Sundays.\n` +
            `\`\`\``
            return message.channel.send(reportUsageString)
        }
        else {
            // Check that price is a number between 0 and 999
            if (isNaN(args[0]) || args[0] < 0 || args[0] > 999) {
                return message.channel.send(
                    // FIXME: Incorporate error script here
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

                userData.users[message.author.id]["prices"][reportString] = parseInt(args[0])

                let price_array = [
                    parseInt(userData.users[message.author.id].prices.sun),
                    parseInt(userData.users[message.author.id].prices.sun),
                    parseInt(userData.users[message.author.id].prices.monAM),
                    parseInt(userData.users[message.author.id].prices.monPM),
                    parseInt(userData.users[message.author.id].prices.tueAM),
                    parseInt(userData.users[message.author.id].prices.tuePM),
                    parseInt(userData.users[message.author.id].prices.wedAM),
                    parseInt(userData.users[message.author.id].prices.wedPM),
                    parseInt(userData.users[message.author.id].prices.thuAM),
                    parseInt(userData.users[message.author.id].prices.thuPM),
                    parseInt(userData.users[message.author.id].prices.friAM),
                    parseInt(userData.users[message.author.id].prices.friPM),
                    parseInt(userData.users[message.author.id].prices.satAM),
                    parseInt(userData.users[message.author.id].prices.satPM)
                ]

                let p = new Predictor(price_array, false, patternToInt[userData.users[message.author.id]["prices"]["lastPattern"]])
                // console.log("Prediction for current data:")
                // console.log(`Result for parse int of \'\': ${parseInt('')}`)
                // console.log(p.analyze_possibilities())
                // console.log(JSON.stringify(p.analyze_possibilities(), null, 4))

                let min
                let max
                let ssProb
                let lsProb
                let dProb
                let fProb

                // F: 0, LS: 1, D: 2, SS: 3
                for (let poss of p.analyze_possibilities()) {
                    if (poss["pattern_number"] === 0 && fProb === undefined) {
                        fProb = convertPercentage(poss["category_total_probability"])
                    }
                    else if (poss["pattern_number"] === 1 && lsProb === undefined) {
                        lsProb = convertPercentage(poss["category_total_probability"])
                    }
                    else if (poss["pattern_number"] === 2 && dProb === undefined) {
                        dProb = convertPercentage(poss["category_total_probability"])
                    }
                    else if (poss["pattern_number"] === 3 && ssProb === undefined) {
                        ssProb = convertPercentage(poss["category_total_probability"])
                    }
                    else if (poss["pattern_number"] === 4) {
                        min = poss["weekGuaranteedMinimum"]
                        max = poss["weekMax"]
                    }
                }
                if (fProb === undefined) {
                    fProb = "0"
                }
                if (lsProb === undefined) {
                    lsProb = "0"
                }
                if (dProb === undefined) {
                    dProb = "0"
                }
                if (ssProb === undefined) {
                    ssProb = "0"
                }

                userData.users[message.author.id].prices.predictions = {
                    "SS": ssProb,
                    "LS": lsProb,
                    "D": dProb,
                    "F": fProb,
                    "min": min,
                    "max": max
                }

                writeUserData(userData, date)
                return message.channel.send(`Recorded price ${args[0]} for ${reportString}`)
            }
        }
    }

    // Allow users to report last week's pattern
    if (command === "pattern") {
        let patternUsageString =
            `\`\`\`${prefix}pattern usage:\n` +
            `  ${prefix}pattern [pattern type(SS, LS, D, F, U)]: Record last week's pattern` +
            `\`\`\``
        if (!args.length) {
            return message.channel.send(patternUsageString)
        }
        else if (typeof args[0] !== "string" || !(patternRef.includes(args[0].toUpperCase()))){
            return message.channel.send(
                // FIXME: Incorporate error script here
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
            userData.users[message.author.id]["prices"]["lastPattern"] = args[0].toUpperCase()
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
            "                                                                                                     |============Predictions============|\n" +
            "User           |Pattern|BuyAt|MonAM|MonPM|TueAM|TuePM|WedAM|WedPM|ThuAM|ThuPM|FriAM|FriPM|SatAM|SatPM|  SS%|  LS%|   D%|   F%|  Min|  Max|\n" +
            "===============|=======|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|=====|\n"

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

            let pattern = user.prices.lastPattern
            pattern = patternPad.slice(pattern.length) + pattern

            let buyAt = user.prices.sun.toString()
            buyAt = pricePad.slice(buyAt.length) + buyAt
            
            let monAM = user.prices.monAM.toString()
            monAM = pricePad.slice(monAM.length) + monAM
            let monPM = user.prices.monPM.toString()
            monPM = pricePad.slice(monPM.length) + monPM
            
            let tueAM = user.prices.tueAM.toString()
            tueAM = pricePad.slice(tueAM.length) + tueAM
            let tuePM = user.prices.tuePM.toString()
            tuePM = pricePad.slice(tuePM.length) + tuePM

            let wedAM = user.prices.wedAM.toString()
            wedAM = pricePad.slice(wedAM.length) + wedAM
            let wedPM = user.prices.wedPM.toString()
            wedPM = pricePad.slice(wedPM.length) + wedPM

            let thuAM = user.prices.thuAM.toString()
            thuAM = pricePad.slice(thuAM.length) + thuAM
            let thuPM = user.prices.thuPM.toString()
            thuPM = pricePad.slice(thuPM.length) + thuPM

            let friAM = user.prices.friAM.toString()
            friAM = pricePad.slice(friAM.length) + friAM
            let friPM = user.prices.friPM.toString()
            friPM = pricePad.slice(friPM.length) + friPM

            let satAM = user.prices.satAM.toString()
            satAM = pricePad.slice(satAM.length) + satAM
            let satPM = user.prices.satPM.toString()
            satPM = pricePad.slice(satPM.length) + satPM
            
            let ssProb = user.prices.predictions.SS
            ssProb = pricePad.slice(ssProb.length) + ssProb
            
            let lsProb = user.prices.predictions.LS
            lsProb = pricePad.slice(lsProb.length) + lsProb
            
            let dProb = user.prices.predictions.D
            dProb = pricePad.slice(dProb.length) + dProb
            
            let fProb = user.prices.predictions.F
            fProb = pricePad.slice(fProb.length) + fProb
            
            let min = user.prices.predictions.min.toString()
            min = pricePad.slice(min.length) + min
            
            let max = user.prices.predictions.max.toString()
            max = pricePad.slice(max.length) + max

            let newTableLine =
                `${userName}|${pattern}|${buyAt}|${monAM}|${monPM}|${tueAM}|${tuePM}|${wedAM}|${wedPM}|${thuAM}|${thuPM}|${friAM}|${friPM}|${satAM}|${satPM}|${ssProb}|${lsProb}|${dProb}|${fProb}|${min}|${max}|\n`

            table += newTableLine
        }

        table += "\`\`\`"

        return message.channel.send(table)
    }

    // Erases all stored user data
    else if (command === "reset") {
        if (admins.includes(message.author.id)) {
            let date = new Date()
            let userData = readUserData()
            for (const user in userData.users) {
                userData.users[user].prices = initializePrices()
                // console.log(`Prices for user ${user}`)
                // console.log(userData.users[user].prices)
            }
            writeUserData(userData, date)

            return message.channel.send("Prices reset")
        }
        else {
            return message.channel.send("Reset can only be initiated by bot admins")
        }
    }

    // Returns a list of commands
    else if (command === "help") {
        return message.channel.send(
            `\`\`\`` +
            `Commands for care and feeding of your friendly Turnip Stalker, who watches you sleep and loves you very much:\n` +
            `  ${prefix}report:   Record past/present turnip prices for the current week\n` +
            `  ${prefix}pattern:  Record last week's price pattern\n` +
            `  ${prefix}prices:   Show a table of recorded prices for the week for all users\n` +
            `  ${prefix}period:   Show the current reporting period\n` +
            `  ${prefix}reset:    Clear all recorded prices (Admins only)\n` +
            `  ${prefix}help:     You're looking at it, and it's looking at you\n` +
            `\nCommands under development:\n` +
            `  ${prefix}announce: Add an announcement to the daily events bulletin.\n` +
            `  ${prefix}events:   Shows all events and announcements for the day.\n` +
            `  ${prefix}open:     Announce your island is open for visitors\n` +
            `  ${prefix}close:    Announce your island is closed to visitors\n` +
            `\`\`\``
        )
    }

});


// login to Discord with your app's token
client.login(token);
