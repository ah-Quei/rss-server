const axios = require('axios');
const Parser = require('rss-parser');
const {JSDOM} = require('jsdom');


// 动态将 XML Element 转为 JS 对象
function xmlElementToObject(el) {
    const obj = {};

    // 属性
    if (el.attributes && el.attributes.length > 0) {
        obj._attributes = {};
        for (const attr of Array.from(el.attributes)) {
            obj._attributes[attr.name] = attr.value;
        }
    }

    // 纯文本（合并所有文本子节点）
    const textNodes = Array.from(el.childNodes).filter(n => n.nodeType === 3);
    const textContent = textNodes.map(n => (n.nodeValue || '').trim()).join('').trim();
    if (textContent) obj._text = textContent;

    // 子元素
    const childElements = Array.from(el.childNodes).filter(n => n.nodeType === 1);
    for (const child of childElements) {
        const key = child.tagName; // 保留命名空间，如 content:encoded
        const childObj = xmlElementToObject(child);

        // 简化仅含纯文本的子元素
        const onlyText = childObj && Object.keys(childObj).length === 1 && typeof childObj._text === 'string';
        const value = onlyText ? childObj._text : childObj;

        if (obj[key] === undefined) {
            obj[key] = value;
        } else if (Array.isArray(obj[key])) {
            obj[key].push(value);
        } else {
            obj[key] = [obj[key], value];
        }
    }

    return obj;
}

async function parseRss(url) {

    let articles = []
    // 1) 拉取原始 XML
    const {data: xml} = await axios.get(url, {
        timeout: 10000,
        headers: {'User-Agent': 'RSS-Service/1.0'}
    });

    // 2) 用 rss-parser 解析结构化数据，并取 content:encoded/creator 等常见字段
    const parser = new Parser({
        timeout: 10000,
        headers: {'User-Agent': 'RSS-Service/1.0'},
        customFields: {
            item: [
                ['content:encoded', 'contentEncoded'],
                ['dc:creator', 'creator']
            ]
        }
    });

    const feed = await parser.parseString(xml);

    // 3) 用 JSDOM 解析 XML，序列化每个 item/entry 节点
    const dom = new JSDOM(xml, {contentType: 'text/xml', url});
    const doc = dom.window.document;

    let nodeList = doc.getElementsByTagName('item');
    if (!nodeList || nodeList.length === 0) {
        nodeList = doc.getElementsByTagName('entry'); // Atom
    }

    // 用 JSON 容器替代原来的 xmlMap/rawXmlArray
    const jsonMap = new Map();

    for (let i = 0; i < nodeList.length; i++) {

        const node = nodeList.item(i);

        // 1) XML 节点 → 动态对象
        const rawObj = xmlElementToObject(node);
        // 2) 对象 → JSON 字符串（若要紧凑输出，把 null, 2 改为 undefined）
        const rawJson = JSON.stringify(rawObj, null, 2);

        let item = feed.items[i]

        const article = {
            title: item.title || '无标题',
            link: item.link,
            description: item.description|| item.summary||item.contentSnippet|| '',
            pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            guid: item.guid,
            content: item.content || '',
            rawJson: rawJson  // 保存原始item对象的json序列化数据
        };


        articles.push(article);

    }


    return articles
}

module.exports = {parseRss};