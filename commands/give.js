module.exports = {
    name: 'give',
    description: 'Transfer eeg bucks to someone',
    args: true,
    type: 'Currency',
    usage: '<@user> <amount>',

    async execute(message, args, currency) {
        const transferAmount = args[1];
        const recipient = args[0];
        console.log(args[0]);

        user = await currency.findOne({where: {user: message.author.tag}})

        if (!user) {
            return message.channel.send('You have no money.')
        }

        if(user.balance < transferAmount) {
            return message.channel.send('You don\'t have enough money to send that amount')
        }

        target = await currency.findOne({where: {user: recipient}})

        if(!target) {
            return message.channel.send('This user hasn\'t made an account for Eeg Bucks yet.')
        }

        if (user.donated + transferAmount > user.donateLimit) {
            return message.channel.send(`This would put you over your daily maximum give limit. You are currently at ${user.donated}/${user.donatedLimit}. Limits reset everyday at midnight.`)
        }

        if (target.received + transferAmount > receivedLimit) {
            return message.channel.send(`This would put the recipient over their gift limit. They are currently at ${target.received}/${target.receivedLimit}. Limits reset everyday at midnight.`)
        }

        user.update()
        
    }
}