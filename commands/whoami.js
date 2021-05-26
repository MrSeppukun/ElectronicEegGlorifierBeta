module.exports = {
    name: 'whoami',
    args: false,
    type: 'personal',

    execute(message, args) {
        message.channel.send('nobody knows who she is, but she is fucking clueless. whoami is a lovely follower of eeg that always has something to say on discord. she can be summoned by saying anything, really');
    }
}