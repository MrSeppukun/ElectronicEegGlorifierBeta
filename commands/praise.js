module.exports = {
    name: 'praise',
    description: 'Praise the almighty glory of Eeg!',
    args: false,
    type: 'Useful',

    execute(message, args) {
        message.channel.send('Praise EEG!!!');
    }
}