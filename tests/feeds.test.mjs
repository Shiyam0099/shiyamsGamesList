import test from 'node:test';
import assert from 'node:assert/strict';
import {XMLParser} from 'fast-xml-parser';
import {parseFeed,mergeArticles,plainText} from '../supabase/functions/gaming-feed/feed-data.mjs';
const rss=items=>`<rss><channel>${items}</channel></rss>`;
const item=(title,url,extra='')=>`<item><title>${title}</title><link>${url}</link><pubDate>Sun, 13 Sep 2026 09:00:00 GMT</pubDate><description><![CDATA[<p>${'Preview '.repeat(40)}</p>]]></description>${extra}</item>`;
test('publisher feeds return safe, attributed short discovery cards',()=>{
 const rows=parseFeed(rss(item('Game &amp; adventure','https://www.gamespot.com/reviews/example','<media:content url="https://www.gamespot.com/image.jpg"/>')), {name:'GameSpot',host:'gamespot.com'},'reviews',XMLParser);
 assert.equal(rows[0].title,'Game & adventure');assert.equal(rows[0].source,'GameSpot');assert.equal(rows[0].kind,'reviews');assert.equal(rows[0].image,'https://www.gamespot.com/image.jpg');assert.ok(rows[0].excerpt.split(' ').length<=24);
 assert.equal(parseFeed(rss(item('Unsafe','javascript:alert(1)')),{name:'GameSpot',host:'gamespot.com'},'news',XMLParser).length,0);
 assert.equal(parseFeed(rss(item('Wrong host','https://gamespot.com.attacker.test/news')),{name:'GameSpot',host:'gamespot.com'},'news',XMLParser).length,0);
 assert.throws(()=>parseFeed('<!DOCTYPE rss SYSTEM "file:///etc/passwd"><rss/>',{name:'GameSpot',host:'gamespot.com'},'news',XMLParser));
});
test('mixed feeds separate game reviews from news and exclude hardware',()=>{
 const feed=rss(item('A game review','https://www.pcgamer.com/games/example-review/','<category>Games</category>')+item('A game announcement','https://www.pcgamer.com/games/announcement/','<category>Games</category>')+item('Laptop review','https://www.pcgamer.com/hardware/laptop/','<category>Hardware</category>'));
 const source={name:'PC Gamer',host:'pcgamer.com'};
 assert.deepEqual(parseFeed(feed,source,'reviews',XMLParser).map(r=>r.title),['A game review']);
 assert.deepEqual(parseFeed(feed,source,'news',XMLParser).map(r=>r.title),['A game announcement']);
});
test('duplicates are removed and latest publication dates sort first',()=>{
 const old={url:'https://example.test/old',publishedAt:'2026-01-01'},recent={url:'https://example.test/recent',publishedAt:'2026-02-01'};
 assert.deepEqual(mergeArticles([[old,recent],[old]]),[recent,old]);assert.equal(plainText('<script>danger()</script>hello &amp; world'),'hello & world');
});
