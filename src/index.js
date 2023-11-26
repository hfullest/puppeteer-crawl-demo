import puppeteer from 'puppeteer';

(async () => {

    // 说明，部分接口针对浏览器做了特殊处理，导致在 Chrome 正常，在 puppeteer 内启动的浏览器请求该接口报406
    // 如果遇到接口报406且影响流程情况下，可以在外部Chrome浏览器获取cookie和头部X-S字段替换到这里，即可正常请求接口，不过有效期好像只有一天
    const constants = {
        url: 'http://xhslink.com/E8inUw',
        cookieDomain: '.xiaohongshu.com',
        cookies: `abRequestId=8d74e937-9a83-5394-a296-fdf338ba8eed; webBuild=3.17.4; xsecappid=xhs-pc-web; a1=18c067da1da49sbh33g7rdj1u80qm3659z1jtjbqm30000428886; webId=626c8b12a670f3e29971a9f08bd45628; gid=yYS8KWf0jYjYyYS8KWf0yuVDf04jMDxqqkWFyA6fVy7Y8Vq8A6qK298884JYYYK8YYJjJqK4; web_session=030037a252be9f46b38da0ac19224ad1b2a741; unread={%22ub%22:%22653c7a560000000025022947%22%2C%22ue%22:%22654c33e7000000003300abdd%22%2C%22uc%22:30}; websectiga=984412fef754c018e472127b8effd174be8a5d51061c991aadd200c69a2801d6; sec_poison_id=b1ab421f-de54-40d6-a2c2-eb64e72621c3; cacheId=0e673bbb-737f-471e-8441-44f3103e4365`,
        headers: {
            'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36`,
            'X-S': `XYW_eyJzaWduU3ZuIjoiNTEiLCJzaWduVHlwZSI6IngxIiwiYXBwSWQiOiJ4aHMtcGMtd2ViIiwic2lnblZlcnNpb24iOiIxIiwicGF5bG9hZCI6IjkzNWVlNDJiNzcyZDlmMjM0ZjE2ZGI2ZDIyOTJkNDVkYWEyYjQzN2NjNmU0MDlmZGRmNmFkZDMzMjJhMWEzMTMyMWRmYTJkMDRjMTI4MWM1ZGYzYWZiODAyNDhmNDVlN2M5ZTNiZmRhMWZhYTFlYjkwZDc0YWEzMWI1NGM3MmNkMGQ3NGFhMzFiNTRjNzJjZGFjNDg5YjlkYThjZTVlNDhmNGFmYjlhY2ZjM2VhMjZmZTBiMjY2YTZiNGNjM2NiNTA0MzlmN2U3ZDgzNWRiMmVlMjNmZTIyZGQ0ZjM3MDIyNGI2YmQyMzg2N2E0YzhmNTc2ODhmNDA2NGQ1MTNlMjYxODBiODdlOWMzYjZlYWZkMGJmYzZhODFiNjg3NDI1NjgwMGYxZWVkZjM0MTgwYzdhODRmODA2YTg0NTU5ZTk1MTNhYWU0ZTQ2ZmQzMWE2MWE5YjgzYTEzMWJiMzA5MTk0NTFhNzBhYWI3N2ExMDZjNjZkODgyZDBjZjgwMjAzNSJ9`,
        }
    }
    const cookiesRecord = Object.fromEntries(constants.cookies.split(';').map(it => it.trim().split('=')));

    /** 初始化环境配置，手动输入cookie */
    async function initEnv() {
        // 启用 Network 监听
        await page.setRequestInterception(true);

        // 监听所有网络请求
        page.on('request', request => {
            const headers = request.headers();
            // puppeteer 和 Chrome 有差异，解决部分接口报 406 问题
            if (headers['x-s']) { headers['x-s'] = constants.headers['X-S'] }
            if (headers['cookie']) { headers['cookie'] = constants.cookies }
            request.continue({ url: request.url(), headers });
        });

        await page.setCookie(
            ...Object.entries(cookiesRecord).map(([name, value]) => ({ name, value, domain: constants.cookieDomain }))
        )

        // 设置屏幕尺寸
        await page.setViewport({ width: 1080, height: 1024 });
    }

    async function listenNetwork() {
        await page.setRequestInterception(true);
        // 监听所有网络请求
        page.on('request', request => {
            // 这里可以处理网络请求
            request.continue();
        });

        // 监听所有网络响应
        page.on('response', async response => {
            const request = response.request();
            const url = request.url();
            // 这里可以处理网络响应，因此这里也可以拿到图片视频等所有资源请求
        });
    }

    /** 未登录时会弹出登录窗口，自动关闭登录弹窗 */
    async function closeLoginModal() {
        // 有弹窗则关闭，没有则捕获promise.reject不影响后续流程
        try {
            await page.waitForSelector('.login-container', { timeout: 2000 }); // 等待2s，如果弹窗还没出现则默认弹窗不在，timeout可以调整
            await page.click('.login-container .close-button');
        } catch (e) { }
    }

    async function collectImage() {
        try {
            const noteContainer = await page.waitForSelector('#noteContainer');

            // 获取目标元素数组的style属性集合
            const styles = await noteContainer.$$eval('.swiper-wrapper .swiper-slide', nodes => nodes.map(it => it.getAttribute('style')));


            // 从style的background里获取图片链接
            const images = styles.map(it => it.match(/url\("([^"]+)"\)/)?.[1])?.filter(Boolean);

            const deWeightImages = Array.from(new Set(images).values());// 去重

            if (images?.length) assets.images.push(...deWeightImages);

        } catch (e) { }
    }

    async function collectVideo() {
        try {
            const noteContainer = await page.waitForSelector('#noteContainer');

            await noteContainer.waitForSelector('.player-el', { timeout: 2000 }); // 2s超时

            const videoSrc = await noteContainer.$eval('video', node => node.src);

            if (videoSrc) assets.video.push(videoSrc);

        } catch (e) { }
    }


    // 启动浏览器打开新页面
    const browser = await puppeteer.launch({ headless: false }); // 可以根据情况关闭浏览器头
    const page = await browser.newPage();

    // 环境配置尽量在页面加载之前，否则可能会有部分接口处理不到
    await initEnv();

    // await listenNetwork();

    // 导航到url
    await page.goto(constants.url);

    await closeLoginModal();

    const assets = {
        images: [],
        video: [],
    }

    await collectImage();

    await collectVideo();

    console.log('图片链接：', assets)

    await browser.close();
})();