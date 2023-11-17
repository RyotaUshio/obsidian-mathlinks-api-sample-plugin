import { normalizePath } from 'obsidian';
import { BlockSubpathResult, HeadingSubpathResult, Plugin, PluginSettingTab, Setting, TFile, ToggleComponent } from 'obsidian';
import { Provider, addProvider, update } from 'obsidian-mathlinks';

interface MyPluginSettings {
	key: string;
	enableInSourceMode: boolean;
	excludedFolders: string[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	key: 'link-display',
	enableInSourceMode: false,
	excludedFolders: [],
}

class MyProvider extends Provider {
	constructor(mathLinks: any, public plugin: MyPlugin) {
		super(mathLinks);
	}

	provide(
		parsedLinktext: { path: string, subpath: string },
		targetFile: TFile | null,
		targetSubpathResult: HeadingSubpathResult | BlockSubpathResult | null,
		sourceFile: TFile
	): string | null {

		// ignore excluded folders
		if (this.plugin.settings.excludedFolders.some(folder =>
			sourceFile.path.startsWith(normalizePath(folder + '/')))
		) return null;

		const { app, settings } = this.plugin;
		const { path } = parsedLinktext;

		if (!targetFile) return null;

		const targetCache = app.metadataCache.getFileCache(targetFile);
		if (!targetCache) return null;

		let noteTitleDisplay = targetCache.frontmatter?.[settings.key];

		if (typeof noteTitleDisplay != 'string') noteTitleDisplay = targetFile.basename;

		if (targetSubpathResult?.type == 'heading') {
			return (path ? `${noteTitleDisplay} - ` : '')
				+ `h${targetSubpathResult.current.level}:${targetSubpathResult.current.heading}`;
		} else if (targetSubpathResult?.type == 'block') {
			const { id } = targetSubpathResult.block;
			let blockType = targetCache?.sections?.find(section => section.id == id)?.type;
			if (!blockType && targetCache?.listItems?.find(section => section.id == id)) {
				blockType = 'listitem';
			}
			blockType = blockType ?? 'block';
			return (path ? `${noteTitleDisplay} - ` : '')
				+ `${blockType}:${id}`;
		}

		return noteTitleDisplay;
	}

	get enableInSourceMode() {
		// read from the plugin settings
		return this.plugin.settings.enableInSourceMode;
	}

	set enableInSourceMode(enable: boolean) {
		// overwrite to the plugin settings
		this.plugin.settings.enableInSourceMode = enable;
		this.plugin.saveSettings();
		// inform MathLinks that the settings have changed
		update(this.plugin.app);
	}

	/**
	 * If you want to just follow the settings for MathLinks, you can just use the following (getter only):
	 */
	// get enableInSourceMode() {
	//     return this.mathLinks.nativeProvider.enableInSourceMode;
	// }
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	provider: MyProvider;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MySettingTab(this));
		this.app.workspace.onLayoutReady(() => {
			this.provider = addProvider(this.app, (mathLinks) => new MyProvider(mathLinks, this));
			this.addChild(this.provider);
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MySettingTab extends PluginSettingTab {
	constructor(public plugin: MyPlugin) {
		super(plugin.app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Property key')
			.setDesc('What property do you want to use to specify how the note title is displayed in a link?')
			.addText(text =>
				text.setValue(this.plugin.settings.key)
					.onChange(async (key) => {
						this.plugin.settings.key = key;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Enable in Source mode")
			.setDesc("Currently, only wikilinks are supported in Source mode.")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(this.plugin.provider.enableInSourceMode)
					.onChange((value: boolean) => {
						this.plugin.provider.enableInSourceMode = value;
					});
			});

		new Setting(containerEl)
			.setName('Excluded folders')
			.setDesc('Comma-separated list of folder where you want to deactivate this plugin.')
			.addText(text =>
				text.setValue(this.plugin.settings.excludedFolders.join(','))
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = value.split(',').map(s => s.trim());
						await this.plugin.saveSettings();
					})
			);
	}
}
