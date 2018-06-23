const path = require("path")
const fs = require('fs')

const request = require(path.dirname(module.parent.filename) + '/../node_modules/request')

class BetterTTVEmotes {

	constructor(tool)
	{
		const self = this
		this._tool = tool

		this.emoticonDrawer = null
		this.globalEmotes = {}
		this.channelEmotes = {}

		this._tool.on('load', async () => {
			self.emoticonDrawer = document.querySelector('#chat_message_emotes_emoticons')
			try {
				self.globalEmotes = await self.loadEmotes()
			} catch(e) {}
		})
		this._tool.cockpit.on('channelopen', async () => {
			self.channelEmotes = {}
			try {
				self.channelEmotes = await self.loadEmotes(self._tool.cockpit.openChannelObject.login)
			} catch(e) {}
			self.fillInEmotes()
		})
	}

	loadEmotes(channel)
	{
		if(typeof(channel) !== 'string') channel = ''
		return new Promise((resolve, reject) => {
			request({
				method: 'GET',
				uri: (channel.length > 0 ? 'https://api.betterttv.net/2/channels/' + encodeURIComponent(channel) : 'https://api.betterttv.net/2/emotes'),
				json: true
			}, (error, response, body) => {
				if(error) {
					reject(error)
				} else {
					if(response.statusCode !== 200) {
						reject(new Error(response.statusCode + ' - ' + response.statusMessage))
					} else {
						if(typeof(body) == 'object' && body.hasOwnProperty('urlTemplate') && body.hasOwnProperty('emotes')) {
							resolve(body)
						} else{
							reject(new Error('Unexpetected response. Maybe the API has changed?'))
						}
					}
				}
			})
		})
	}

	waitForTwitchEmotes()
	{
		const self = this
		return new Promise((resolve, reject) => {
			if(!self._tool.cockpit.emotesLoaded) {
				setTimeout(() => {
					self.waitForTwitchEmotes().then(() => {
						resolve()
					}).catch((e) => {
						reject()
					})
				}, 1000)
			} else {
				resolve()
			}
		})
	}

	async fillInEmotes()
	{
		await this.waitForTwitchEmotes()

		let emoteSets = []
		if(this.globalEmotes.hasOwnProperty('urlTemplate') && this.globalEmotes.hasOwnProperty('emotes')) {
			if(this.globalEmotes.urlTemplate.startsWith('//'))
				this.globalEmotes.urlTemplate = 'https:' + this.globalEmotes.urlTemplate

			let globalEmoteSet = []
			this.globalEmotes.emotes.forEach((em) => {
				globalEmoteSet.push({
					code: em.code,
					url: this.globalEmotes.urlTemplate.replace(/\{\{id\}\}/ig, em.id).replace(/\{\{image\}\}/ig, '1x')
				})
			})
			if(globalEmoteSet.length > 0) emoteSets.push(globalEmoteSet)
		}
		if(this.emoticonDrawer != null && this.emoticonDrawer.hasOwnProperty('_tag')) {
			this.emoticonDrawer._tag.setemotes(this.emoticonDrawer._tag.emotes.concat(emoteSets))
		}

		emoteSets = []
		if(this.channelEmotes.hasOwnProperty('urlTemplate') && this.channelEmotes.hasOwnProperty('emotes')) {
			if(this.channelEmotes.urlTemplate.startsWith('//'))
				this.channelEmotes.urlTemplate = 'https:' + this.channelEmotes.urlTemplate

			let channelEmoteSet = []
			this.channelEmotes.emotes.forEach((em) => {
				channelEmoteSet.push({
					code: em.code,
					url: this.channelEmotes.urlTemplate.replace(/\{\{id\}\}/ig, em.id).replace(/\{\{image\}\}/ig, '1x')
				})
			})
			if(channelEmoteSet.length > 0) emoteSets.push(channelEmoteSet)
		}

		if(this.emoticonDrawer != null && this.emoticonDrawer.hasOwnProperty('_tag')) {
			this.emoticonDrawer._tag.setemotes(emoteSets.concat(this.emoticonDrawer._tag.emotes))
		}
	}

	findAndReplaceInMessage(message) {
		let replacings = []
		let emotes = []
		if(this.globalEmotes.hasOwnProperty('urlTemplate') && this.globalEmotes.hasOwnProperty('emotes')) {
			if(this.globalEmotes.urlTemplate.startsWith('//'))
				this.globalEmotes.urlTemplate = 'https:' + this.globalEmotes.urlTemplate

			this.globalEmotes.emotes.forEach((em) => {
				emotes.push({
					code: em.code,
					url: this.globalEmotes.urlTemplate.replace(/\{\{id\}\}/ig, em.id).replace(/\{\{image\}\}/ig, '1x')
				})
			})
		}
		if(this.channelEmotes.hasOwnProperty('urlTemplate') && this.channelEmotes.hasOwnProperty('emotes')) {
			if(this.channelEmotes.urlTemplate.startsWith('//'))
				this.channelEmotes.urlTemplate = 'https:' + this.channelEmotes.urlTemplate

			this.channelEmotes.emotes.forEach((em) => {
				emotes.push({
					code: em.code,
					url: this.channelEmotes.urlTemplate.replace(/\{\{id\}\}/ig, em.id).replace(/\{\{image\}\}/ig, '1x')
				})
			})
		}

		for(let i = 0; i < emotes.length; i++) {
			var e = emotes[i]

			var regex = new RegExp('(\\s|^)('+e.code.replace('(', '\\(').replace(')', '\\)')+')($|\\s)', 'g')
			var matched = false
			while(match = regex.exec(message)) {
				regex.lastIndex = match.index+1
				var ni = -1

				var start = match.index
				if(match[1].length > 0) start++
				var end = start+match[2].length-1
				ni = end+1

				replacings.push({
					'replaceWith': '<img src="' + e.url + '" srcset="' + e.url + ' 1x, ' + e.url.replace('/1x', '/2x') + ' 2x, ' + e.url.replace('/1x', '/3x') + ' 4x" alt="{__NEEDLE__}" title="{__NEEDLE__}" class="emote">',
					'start': start,
					'end': end
				})
			}
		}
		return replacings
	}

}
module.exports = BetterTTVEmotes