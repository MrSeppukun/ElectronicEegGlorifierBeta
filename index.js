//Imports
const Discord = require('discord.js');
const {prefix, token} = require("./config.json");
const fs = require('fs');
const { Console } = require('console');
const {Sequelize, Op} = require('sequelize')
const currency = new Discord.Collection();
const {Users, CurrencyShop, dailyCooldown, UserItems, JobList, CommunityGoal} = require('./dbObjects');
const cron = require('cron');
const community = require('./commands/community');
const BlackjackGames = require('./models/BlackjackGames');
const anon = require('./commands/anon');

//Main initializations for bot
const client = new Discord.Client();
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

async function priceChange() {
    const items = await CurrencyShop.findAll();
    items.forEach(item => {
        let mToday = item.todayBuys - item.todaySells;
        let mYesterday = item.yesterdayBuys - item.yesterdaySells;

        mPurchases = (mToday - mYesterday) / 200;
        if (mPurchases >= 0) {
            if (mPurchases > .2) {
                mPurchases = .2;
            }


            newBuyPrice = Math.floor(item.cost * (1 + mPurchases));
            newSellPrice = Math.floor(newBuyPrice / 2);
        }

        else {
            if (mPurchases < -.2) {
                mPurchases = -.2;
            }

            newBuyPrice = Math.floor(item.cost / (1 + -1 * mPurchases));
            newSellPrice = Math.floor(newBuyPrice / 2);
        }

        if (newBuyPrice < 10) {
            newBuyPrice = 10;
            newSellPrice = 5;
        }

        
        CurrencyShop.update({cost: newBuyPrice}, {where: {name: item.name}});
        CurrencyShop.update({sellPrice: newSellPrice}, {where: {name: item.name}});

        CurrencyShop.update({yesterdayBuys: item.todayBuys}, {where: {name: item.name}});
        CurrencyShop.update({yesterdaySells: item.todaySells}, {where: {name: item.name}});
        CurrencyShop.update({todayBuys: 0}, {where: {name: item.name}});
        CurrencyShop.update({todaySells: 0}, {where: {name: item.name}});
    })
}

async function currencySync() {
    const storedBalances = await Users.findAll();
    storedBalances.forEach(b => currency.set(b.user_id, b));

    const community = await CommunityGoal.findOne({where: {id: 1}})

    if (community) {
        if (community.dataValues.donated >= community.dataValues.cost && community.dataValues.cost !== 0) {
            CommunityGoal.update({reward: '', cost: 0, donated: 0}, {where: {id: 1}})
            client.users.cache.find(user => user.id === '361271569496014852').send('The community goal has been met!')
        }
    }
    
}

let job1 = new cron.CronJob('0 0 0 * * *', priceChange);
let currencyUpdate = new cron.CronJob('* * * * * *', currencySync);

//Initializing db
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
});

//Formatting db
const messageDB = sequelize.define('Messages', {
    name: { 
        type: Sequelize.STRING
    },
    message: Sequelize.TEXT,
});

const anonConvos = sequelize.define('Active_Conversations', {
    id: {
        unique: true,
        primaryKey: true,
        type: Sequelize.INTEGER
    },
    user: {
        type: Sequelize.STRING,
        allowNull: false
    }, 
    helper: {
        type: Sequelize.STRING
    }
});

//Formatted embed for new members
const exampleEmbed = new Discord.MessageEmbed()
    .setColor('#ff0000')
    .setTitle('The Rules')
    .setDescription('Please read the rules to gain access to the discord')
    .addFields(
        {name: 'Rule #1', value: 'Be Respectful and Considerate of Your Peers'},
        {name: 'Rule #2', value: 'Refrain From Vulgar Comments'},
        {name: 'Rule #3', value: 'Don\'t spam'},
        {name: 'Rule #4', value: 'No Inappropriate Links, Images, or Videos'},
        {name: 'Rule #5', value: 'Place Content in the Appropriate Channel'},
        {name: 'Rule #6', value: 'Have Fun'},
    )
    .setFooter('Please react to this message to state that you agree to our rules')

//setting all available commands
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

Reflect.defineProperty(currency, 'add', {
    value: async function add(id, amount) {
        const user = currency.get(id);
        if (user) {
            user.balance += Number(amount);
            return user.save();
        }

        const newUser = await Users.create({user_id: id, balance: amount});
        currency.set(id, newUser);
        return newUser;
    },
});

Reflect.defineProperty(currency, 'getBalance', {
    value: function getBalance(id) {
        const user = currency.get(id);
        return user ? user.balance : 0;
    },
});

//Runs on startup
client.once('ready', async () => {
    console.log('Ready!');
    messageDB.sync();
    anonConvos.sync();
    const storedBalances = await Users.findAll();
    storedBalances.forEach(b => currency.set(b.user_id, b));
    job1.start();
    currencyUpdate.start();
});


//When a new member joins the server
client.on("guildMemberAdd", (member) => {
    console.log("User joined");
    
    //Attempt to send the user the rule embed then react with a thumbs up for the new person to easily click
    try{
        member.send(exampleEmbed)
            .then(sentEmbed => {sentEmbed.react('👍')
            const filter = (reaction, user) => {

                //returns when the user reacts to the bots message
                return reaction.emoji.name === '👍' && user.id !== sentEmbed.author.id;
            }

            //When a new reaction is added from a non bot it sends a message and then gives the user a role in the server to let them see other channels
            sentEmbed.awaitReactions(filter, {max: 1})
                .then(collected => {
                    member.send('Welcome to the server');
                    var role = member.guild.roles.cache.find(role => role.name === "Followers");
                    member.roles.add(role);

                }).catch(console.error);
            });

    } catch {
        console.error;
    }

});

//Runs when message is sent
client.on("message", async message => {

    //Word corrections
    if (message.channel.type === "dm") {
        user = await anonConvos.findOne({where: {user: message.author.tag}})
        if (user) {
            if (message.content === '!close') {
                
                helperId = client.users.cache.find(u => u.tag === user.helper)
                helperId.send("The other user has ended the conversation.")
                anonConvos.destroy({where: {user: message.author.tag}})
                return message.channel.send('You closed your conversation. You can always use this if you need help, so please make sure to use it when you need it')
            }

            helper = user.helper
            if (!helper) {
                return message.channel.send('Please wait a bit for someone to reply.')
            }

            else {
                helperId = client.users.cache.find(u => u.tag === helper)
                return helperId.send(message)
            }
            
        }
            
        helper = await anonConvos.findOne({where: {helper: message.author.tag}})
        if (helper) {
            if (message.content === "!close") {
                userId = client.users.cache.find(u => u.tag === helper.user)
                userId.send("The other user has ended the conversation.")
                anonConvos.destroy({where: {helper: message.author.tag}})
                return message.channel.send("The conversation has been ended.")
            }

            user = helper.user
            if (!user) {
                return message.channel.send('Please wait a bit for someone to reply.')
            }
            userId = client.users.cache.find(u => u.tag === user)
            return userId.send(message)
        }
    }

    if (!message.content.startsWith(prefix) && !message.author.bot) {
        if (message.content.includes('excellent')) {
            message.reply('*Eegcellent');
        }
    
        if (message.content.includes('egg')) {
            message.reply('Eww!');
        }
    
    }
    //Ignores any message without the prefix or sent by the bot
    
    //Puts all arguments in an array to access later
    const args = message.content.slice(prefix.length).trim().split(/ +/);

    //Gets the name of the command used
    const commandName = args.shift().toLowerCase();

    //If the command doesn't match an available command, return
    if (!client.commands.has(commandName)) return;

    //Gets the command the user called
    const command = client.commands.get(commandName);

    if((message.author.tag === 'wickeditch#6576' || message.author.tag === 'MrSethreekun#7408') && commandName != 'anon') {
        if (message.channel.type === 'dm') {
            return message.channel.send('Stop using the bot in dms you nerd')
        }
    }

    //If the command was supposed to have args and none were provided
    if (command.args && !args.length) {

        //Sends a message letting user know along with usage where possible
        let reply = `You didn't provide any arguments ${message.author}! `;

        if(command.usage) {
            reply += `The correct usage for this command is: \`${prefix}${command.name} ${command.usage}\``;
        }
        return message.channel.send(reply);
    }

    //Attempts to execute the command the user executed. Sends a message if something fails
    try {
        if (commandName === 'bal') {
            command.execute(message, args, currency);
        }

        else if (commandName === 'dice') {
           
            let wager = args[0] * -1
            const result = command.execute(message, args, currency);
            

            if (result === 1) {
                currency.add(message.author.tag, wager);
                currency.add(message.author.tag, args[0] * 3);
                message.channel.send(`You won ${args[0] * 3} Eeg Bucks. Your new total is ${currency.getBalance(message.author.tag)}`);
            }

            else if (result === 2) {
                currency.add(message.author.tag, wager);
                message.channel.send('Unfortunately, you lost your wager');
            }
        }

        else if(commandName === 'leaderboard') {

            let baseList = currency.sort((a,b) => b.balance - a.balance).first(10).map((user, position) => user.user_id);
            let trimmedList = [];

            for (i = 0; i < baseList.length; i++) {
                trimmedList.push(baseList[i].split('#')[0]);
            }

            let leaderboardList = 'Richest Server Members: \n\n';

            for (i = 0; i < trimmedList.length; i++) {
                leaderboardList += `**${i + 1})** \`${trimmedList[i]}\`: E$ ${currency.getBalance(baseList[i])}💰\n\n`;
            }
            
            message.channel.send(leaderboardList);

        }

        else if(commandName === 'daily') {
            let date = new Date().getTime();
            const user = await dailyCooldown.findOne({
                where: {name: message.author.tag}
            })

            if (user) {
                if (date >= user.timeUntilNextUse) {
                    currency.add(message.author.tag, 50);
                    dailyCooldown.update({timeUntilNextUse: date + 86400000}, {where: {name: message.author.tag}});
                    message.channel.send('You received E$50! Use this command again in 24 hours for another 50.');
                }

                else {
                    let difference = user.timeUntilNextUse - date;
                    const hours = Math.floor(difference / 3600000);
                    difference -= hours * 3600000;
                    const minutes = Math.floor(difference / 60000);
                    difference -= minutes * 60000;
                    const seconds = Math.floor(difference / 1000);

                    message.channel.send(`This command is still on cooldown for another ${hours} hours, ${minutes} minutes, and ${seconds} seconds.`);
                }
                
            }

            else {
                date += 86400000;
                dailyCooldown.create({name: message.author.tag, timeUntilNextUse: date});
                message.channel.send('You received E$50! Use this command again in 24 hours for another 50.');
                currency.add(message.author.tag, 50);
            }


            //dailyCooldown.setCooldown(message.author, date);
        }

        else if(commandName === 'shop') {
            command.execute(message, args, CurrencyShop);
        }

        else if(commandName === 'buy') {
            const item = await CurrencyShop.findOne({where: {id: args[0]}});
            if (!item) return message.channel.send('That item doesn\'t exist');

            let totalCost = 0;
            let amount = 1;

            if (args[1]) {
                amount = parseInt(args[1]);
            }

            totalCost += amount * item.cost;

            if (totalCost > currency.getBalance(message.author.tag)) {
                return message.channel.send(`You don\'t have enough money to make this purchase. You need ${totalCost - currency.getBalance(message.author.tag)} more Eeg Bucks`);
            }

            const user = await Users.findOne({where: {user_id: message.author.tag}});
            currency.add(message.author.tag, -totalCost);
            for (i = 0; i < amount; i++) {
                await user.addItem(item);

                const currentBuys = parseInt(item.todayBuys);
                CurrencyShop.update({todayBuys: currentBuys + amount}, {where: {name: item.name}});
            }


            message.channel.send(`You bought: ${amount} ${item.name}`);
        }

        else if (commandName === 'sell') {
            
            const item = await CurrencyShop.findOne({where: {name: {[Op.like]: args[0]}}});

            if (!item) return message.channel.send('That item doesn\'t exist');

            let totalProfit = 0;
            let amount = 1;

            if (args[1]) {
                amount = args[1];
            }

            totalProfit += amount * item.sellPrice;
            const userItem = await UserItems.findOne({where: {user_id: message.author.tag, item_id: item.id}});

            if (!userItem || userItem.amount < amount) {
                return message.channel.send('You don\'t have enough of this item to make this transaction');
            }

            const user = await Users.findOne({where: {user_id: message.author.tag}});
            currency.add(message.author.tag, totalProfit);
            for (i = 0; i < amount; i++) {
                await user.removeItem(item);

                const currentSells = item.todaySells;
                CurrencyShop.update({todaySells: currentSells + amount}, {where: {name: item.name}});
            }

            return message.channel.send(`You sold ${amount} ${item.name} for E$${totalProfit}`);


        }

        else if (commandName === 'job') {
            if (!args.length) {
                const user = await JobList.findOne({where: {name: message.author.tag}});
                const date = new Date().getTime();

                if (user) {
                    return message.channel.send(`Your current job makes you E$${user.income} per hour.`);
                }

                message.channel.send('You didn\'t have a job so I gave you one that starts at E$1 per hour.')
                return JobList.create({name: message.author.tag, jobLevel: 1, income: 1, lastUsed: date});
                
            }

            else if (args[0] === 'collect') {
                const date = new Date().getTime();
                const user = await JobList.findOne({where: {name: message.author.tag}});
                const lastCheck = user.lastUsed;

                const difference = date - lastCheck;
                let numHours = Math.floor(difference / 3600000);
                if (numHours > 168) {
                    numHours = 168;
                }

                if (numHours === 0) {
                    return message.channel.send('You haven\'t worked for a full hour yet.');
                }

                currency.add(message.author.tag, numHours * user.income);
                JobList.update({lastUsed: date}, {where: {name: message.author.tag}});
                return message.channel.send(`You worked ${numHours} hours and earned E$${numHours * user.income}`);
            }

            else if (args[0] === 'promotion') {
                if (!args[1]) {
                    const user = await JobList.findOne({where: {name: message.author.tag}});

                    if (user) {
                        let promoIncome = Math.exp(.3 * user.jobLevel) + .2;
                        const promoCost = Math.ceil((Math.exp(.5 * user.jobLevel) * 70));
    
                        if (promoIncome <= 7) {
                            if (user.jobLevel === 4) {
                                promoIncome += .1;
                            }
                            promoIncome = Math.ceil(promoIncome + .44);
                        }
    
                        else {
                            promoIncome = Math.floor(promoIncome);
                        }
    
                        return message.channel.send(`A promotion would get you an income of E$${promoIncome} per hour, but it will cost you E$${promoCost} first. If you want the promotion, use !job promotion confirm`);
                    }

                    return message.channel.send('You need a job first in order to get a promotion. Use !job to get one');

                }

                else if (args[1] === 'confirm') {
                    const user = await JobList.findOne({where: {name: message.author.tag}});

                    if (user) {
                        let promoIncome = Math.exp(.3 * user.jobLevel) + .2;
                        const promoCost = Math.ceil((Math.exp(.5 * user.jobLevel) * 70));
                        const jobLevel = user.jobLevel;
                        const date = new Date().getTime();

                        if (promoIncome <= 7) {
                            if (jobLevel === 4) {
                                promoIncome += .1;
                            }
                            promoIncome = Math.ceil(promoIncome + .44);
                        }
    
                        else {
                            promoIncome = Math.floor(promoIncome);
                        }

                        if (currency.getBalance(message.author.tag) >= promoCost) {
                            currency.add(message.author.tag, -promoCost);
                            JobList.update({jobLevel: jobLevel + 1, income: promoIncome, lastUsed: date}, {where: {name: message.author.tag}});

                            return message.channel.send(`Congratulations you now make E$${promoIncome} per hour.`);
                        }

                        else {
                            return message.channel.send(`You can't afford this promotion. It requires E$${promoCost}.`);
                        }
                    }

                    else {
                        return message.channel.send('You need a job to get a promotion. Use !job to get one');
                    }
                }
            }
        }

        else if(commandName === 'inv') {
            let inventoryEmbed = new Discord.MessageEmbed()
                .setColor('#ff0000')
                .setTitle('Your Stuff');

            const user = await Users.findOne({where: {user_id: message.author.tag}});

            if (user) {
                const items = await user.getItems();

                if (!items.length) return message.channel.send('You\'ve got nothing');
                items.forEach(item => inventoryEmbed.addField(item.item.name, `Quantity: ${item.amount}`));
                return message.channel.send(inventoryEmbed);
            }

            return message.channel.send('You\'ve got nothing');
            
        }

        else if(commandName === 'community') {
            let community = await CommunityGoal.findOne({where: {id: 1}})

            if (community) {
                if(!args.length) {
                    if (community.dataValues.cost !== 0) {
                        return message.channel.send(`The cost for this community reward is E$${community.dataValues.cost}. So far, everyone has raised E$${community.dataValues.donated}. The reward is ${community.dataValues.reward}. Use !community <amount> to contribute!`)
                    }
    
                    return message.channel.send('There is no active community goal right now. Check back later.')
                }
    
                if (args[0] % 1 === 0) {
                    const balance = currency.getBalance(message.author.tag)
    
                    if (balance >= args[0]) {
    
                        amount = community.dataValues.donated + parseInt(args[0])
    
                        CommunityGoal.update({donated: amount}, {where: {id: 1}})
                        currency.add(message.author.tag, -args[0])
                        return message.channel.send(`Thank you for your contribution! This makes the new total E$${amount} of the E$${community.dataValues.cost} needed for this reward.`)
                    }
                    
                    return message.channel.send('You don\'t have enough Eeg Bucks to donate that amount!')
                }
            }
            
            if(args[0] === 'set' && message.author.tag === 'MrSeppukun#7238') {
                if (args.length < 3) {
                    return message.channel.send('Not enough args. Usage is !community set <goal> <reward>')
                }

                let reward = ''

                for (i = 2; i < args.length - 1; i++) {
                    reward += args[i] + ' '
                }
                reward += args[args.length - 1]

                if (community) {
                    CommunityGoal.update({reward: reward, cost: args[1], donated: 0} , {where: {id: 1}})
                    return message.channel.send('New community challenge created !')
                }
                CommunityGoal.upsert({reward: reward, cost: args[1], donated: 0})
                return message.channel.send('New community challenge created!')
        
            }

            return message.channel.send('Something went wrong.')
        }

        else if(commandName === 'blackjack') {
            let deck = [[':spades:A', 1],[':spades:2', 2],[':spades:3', 3],[':spades:4', 4],[':spades:5', 5],[':spades:6', 6],[':spades:7', 7],[':spades:8', 8],[':spades:9', 9],
            [':spades:10', 10],[':spades:J', 10],[':spades:Q', 10],[':spades:K', 10],[':hearts:A', 1],[':hearts:2', 2],[':hearts:3', 3],[':hearts:4', 4],[':hearts:5', 5],
            [':hearts:6', 6],[':hearts:7', 7],[':hearts:8', 8],[':hearts:9', 9],[':hearts:10', 10],[':hearts:J', 10],[':hearts:Q', 10],[':hearts:K', 10],[':clubs:A', 1],
            [':clubs:2', 2],[':clubs:3', 3],[':clubs:4', 4],[':clubs:5', 5],[':clubs:6', 6],[':clubs:7', 7],[':clubs:8', 8],[':clubs:9', 9],[':clubs:10', 10],[':clubs:J', 10],
            [':clubs:Q', 10],[':clubs:K', 10],[':diamonds:A', 1],[':diamonds:2', 2],[':diamonds:3', 3],[':diamonds:4', 4],[':diamonds:5', 5],[':diamonds:6', 6],[':diamonds:7', 7],
            [':diamonds:8', 8],[':diamonds:9', 9],[':diamonds:10', 10],[':diamonds:J', 10],[':diamonds:Q', 10],[':diamonds:K', 10],]

            let user = await BlackjackGames.findOne({where: {id: message.author.tag}})

            if (user) {
                return message.channel.send('You have an active game already. Finish that first!');
            }

            BlackjackGames.add()
        }

        else {
            command.execute(message, args, client, messageDB, anonConvos);
        }

       


    } catch(error) {
        console.error(error);
        message.reply('Something went wrong while executing that command!');
    }
});






client.login(token);