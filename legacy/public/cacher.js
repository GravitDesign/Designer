importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/5.1.4/workbox-sw.js",
);

if (workbox) {
  workbox.setConfig({ debug: false });
  workbox.core.setCacheNameDetails({
    prefix: "gravit-designer",
    precache: "precache",
    runtime: "precache",
  });
  workbox.precaching.precacheAndRoute(
    [
      {
        revision: "6e6452156b7d8d3f59fe9914f0b8eadc_8795",
        url: "assets/annotation/touch/preserve-aspect-ratio-handle.png",
      },
      {
        revision: "fab86920eeffc1d0fcfff409d20ab3e1_8795",
        url: "assets/annotation/touch/rotate-handle.png",
      },
      {
        revision: "121db45e8aaa68f84e1040d364ca3980_8795",
        url: "assets/annotation/touch/skew-horizontal-handle.png",
      },
      {
        revision: "0cfa62f46a68013641d1686191c3536f_8795",
        url: "assets/annotation/touch/skew-vertical-handle.png",
      },
      {
        revision: "cccb897485813c7c256901dbca54ecf2_8795",
        url: "assets/cloud/font/Lato-Bold.woff2",
      },
      {
        revision: "7244318390cc4d36aac4a613ff42d308_8795",
        url: "assets/cloud/font/Lato-Light.woff2",
      },
      {
        revision: "bd03a2cc277bbbc338d464e679fe9942_8795",
        url: "assets/cloud/font/Lato-Regular.woff2",
      },
      {
        revision: "8b4f872c5de19974857328d06d3fe48f_8795",
        url: "assets/cloud/font/Lato-Semibold.woff2",
      },
      {
        revision: "574fd0b50367f886d359e8264938fc37_8795",
        url: "assets/cloud/font/Roboto-Medium.woff2",
      },
      {
        revision: "77c036da9b11190ee359a7d8c9d21a13_8795",
        url: "assets/cloud/img/background-footer.png",
      },
      {
        revision: "109b57f5d746fe11884c2b82f0e5ebc2_8795",
        url: "assets/cloud/img/background-header.png",
      },
      {
        revision: "1d3433b85bec61d5381d6190b5a96eb4_8795",
        url: "assets/cloud/img/badge-money-back.svg",
      },
      {
        revision: "0a68665c94837c24b6dc1a159ae99055_8795",
        url: "assets/cloud/img/left-background.jpeg",
      },
      {
        revision: "c65e6df9b2e87cde1f87a483ff41298f_8795",
        url: "assets/cloud/img/right-background.jpeg",
      },
      {
        revision: "6f3f00bc83e1c1d32c3e6a3d78b94d46_8795",
        url: "assets/cloud/img/scribble.png",
      },
      {
        revision: "5a75312b220a08e8de425121549fd4b1_8795",
        url: "assets/cloud/img/strikeout.svg",
      },
      {
        revision: "0b32cc13a8a9b40ba745fa664b2f5ae8_8795",
        url: "assets/cloud/img/vector_logo.jpg",
      },
      {
        revision: "66f2e4c87a4ea9bf640b1e28d2075a87_8795",
        url: "assets/cursor/comment.svg",
      },
      {
        revision: "e663d6db70e552fbf3bd2f4ba7da8a8a_8795",
        url: "assets/cursor/cross-arrow.svg",
      },
      {
        revision: "b3d0a93cee2c5eca5ac4cde6c88855f1_8795",
        url: "assets/cursor/cross-ellipse.svg",
      },
      {
        revision: "a15db49f4e7c2a7f363cde1c81ccecce_8795",
        url: "assets/cursor/cross-freehand.svg",
      },
      {
        revision: "0321b785b1c6dfb5fdacea2abe8efde3_8795",
        url: "assets/cursor/cross-highlight.svg",
      },
      {
        revision: "cc235e21e5f9b5c74d3adc6997961c36_8795",
        url: "assets/cursor/cross-rectangle.svg",
      },
      {
        revision: "9ff1c43ed8582c2e6800f885920c780f_8795",
        url: "assets/cursor/cross.cur",
      },
      {
        revision: "3c08c323bbb420632e3039a657177a14_8795",
        url: "assets/cursor/cursor-scrub.svg",
      },
      {
        revision: "edb01bc616f67427a31b8f3540b2d13c_8795",
        url: "assets/cursor/hand-closed.cur",
      },
      {
        revision: "b95e66598fd5fe28a68aaea67dfcd9eb_8795",
        url: "assets/cursor/hand-open.cur",
      },
      {
        revision: "a6dd29bc047a87b1aedd0c77549d4add_8795",
        url: "assets/cursor/knife.cur",
      },
      {
        revision: "de75c587053f4080ff2f76a58b36b4f9_8795",
        url: "assets/cursor/lasso.cur",
      },
      {
        revision: "2486c39fdf4dd9de5c642c67b8fddf15_8795",
        url: "assets/cursor/pen-close.cur",
      },
      {
        revision: "4ce8f4c48647dc0473196fed45d72bb2_8795",
        url: "assets/cursor/pen-drag.cur",
      },
      {
        revision: "2486c39fdf4dd9de5c642c67b8fddf15_8795",
        url: "assets/cursor/pen-end.cur",
      },
      {
        revision: "cc886ef2ae0cad14788d1ddc91299f21_8795",
        url: "assets/cursor/pen-minus.cur",
      },
      {
        revision: "700e82bd0b974ef6709bdefae919432f_8795",
        url: "assets/cursor/pen-modify.cur",
      },
      {
        revision: "d2f4550950a2bccca0cb334172a8cea7_8795",
        url: "assets/cursor/pen-plus-middle.cur",
      },
      {
        revision: "f4df0c1dad85fe41b3b65c16809bbac3_8795",
        url: "assets/cursor/pen-plus.cur",
      },
      {
        revision: "f22b0bb89e7c62ff640b84bc6d41c26b_8795",
        url: "assets/cursor/pen-start.cur",
      },
      {
        revision: "69095bf4918be383533f23d677554dad_8795",
        url: "assets/cursor/pen.cur",
      },
      {
        revision: "f7df97af0668e9bb051aa08f940aee50_8795",
        url: "assets/cursor/pipette.cur",
      },
      {
        revision: "a97d06ee460e2939858782b213335950_8795",
        url: "assets/cursor/pixel.cur",
      },
      {
        revision: "42457ba02aa78bd4a6ad4145f2b547f9_8795",
        url: "assets/cursor/select-arrow-only.cur",
      },
      {
        revision: "3de3f30091234b0f576b4cf8c7194a62_8795",
        url: "assets/cursor/select-cross.cur",
      },
      {
        revision: "bb404f0dddcba392947b634c58f3d411_8795",
        url: "assets/cursor/select-curve.cur",
      },
      {
        revision: "4560f20feb72c7a74b74e83823200164_8795",
        url: "assets/cursor/select-dot-inverse.cur",
      },
      {
        revision: "2f905d6c76638561dac4fbdf3d1e712c_8795",
        url: "assets/cursor/select-dot.cur",
      },
      {
        revision: "bcfbf1b699609dfaf41dc1b55f1d6684_8795",
        url: "assets/cursor/select-inverse.cur",
      },
      {
        revision: "823b02e6499ad085e515e6168c2a272f_8795",
        url: "assets/cursor/select-plus-inverse.cur",
      },
      {
        revision: "df4cc06d73452e9fc7732b6840dc00f7_8795",
        url: "assets/cursor/select-plus.cur",
      },
      {
        revision: "3803cd70081634a1772267dfea61c6ff_8795",
        url: "assets/cursor/select-resize-horiz.cur",
      },
      {
        revision: "a3c5ec8d5cee6c2e5e52623d7f7dfe88_8795",
        url: "assets/cursor/select-resize-vert.cur",
      },
      {
        revision: "6769e4899978af77b31910822c313464_8795",
        url: "assets/cursor/select-rot-bc.cur",
      },
      {
        revision: "3455d4a23b01dc7faef4de09221d7611_8795",
        url: "assets/cursor/select-rot-bl.cur",
      },
      {
        revision: "39c6cc60c5be3cce49fab302249d6124_8795",
        url: "assets/cursor/select-rot-br.cur",
      },
      {
        revision: "383f7e1ded37ca6991dbbc19c9300aa6_8795",
        url: "assets/cursor/select-rot-lc.cur",
      },
      {
        revision: "be5098c7be31e4fcf3b6f79fee35a344_8795",
        url: "assets/cursor/select-rot-rc.cur",
      },
      {
        revision: "a8eef1c93cc2de18e5bdd56b84792400_8795",
        url: "assets/cursor/select-rot-round.cur",
      },
      {
        revision: "daeef4682ab9f901869aa18d31963c57_8795",
        url: "assets/cursor/select-rot-tc.cur",
      },
      {
        revision: "7b863bc715ffdcd203f0c18524e5e486_8795",
        url: "assets/cursor/select-rot-tl.cur",
      },
      {
        revision: "80b0ae2325cf4a76d55858df98aed0bc_8795",
        url: "assets/cursor/select-rot-tr.cur",
      },
      {
        revision: "bd13835be17204ad13f5f6ce43fb05b3_8795",
        url: "assets/cursor/select-skew-horiz.cur",
      },
      {
        revision: "e6794527388d54caf011ea5cb7b36f6a_8795",
        url: "assets/cursor/select-skew-vert.cur",
      },
      {
        revision: "e3c8ae1beb585ee73f3b3d33273b3bb7_8795",
        url: "assets/cursor/select-small-rot-round.cur",
      },
      {
        revision: "326b2cb9fac5c184b0ca22bb0d1b4847_8795",
        url: "assets/cursor/select-upleft-downright.cur",
      },
      {
        revision: "8f92d6fa1a25dd357232fd83fb841a54_8795",
        url: "assets/cursor/select-upright-downleft.cur",
      },
      {
        revision: "6d7775d026c15519952cdbd981988bdc_8795",
        url: "assets/cursor/select.cur",
      },
      {
        revision: "b0973edbb7c04f4c9a4aa97ecfd0d5fa_8795",
        url: "assets/cursor/text-resize.cur",
      },
      {
        revision: "7fd76438e58097bc4284cc572dd8ff8e_8795",
        url: "assets/cursor/zoom-minus.cur",
      },
      {
        revision: "a03092f5b8f1f5466f6b597754657495_8795",
        url: "assets/cursor/zoom-none.cur",
      },
      {
        revision: "7467551e66b9a5b4db5a47bcf8ddf3de_8795",
        url: "assets/cursor/zoom-plus.cur",
      },
      {
        revision: "63b827c95804b977dc47e3e7dc97367b_8795",
        url: "assets/data/acv/1977.acv",
      },
      {
        revision: "e781445655a19dd355ee0999f563dc75_8795",
        url: "assets/data/acv/Brannan.acv",
      },
      {
        revision: "1a2ee1fd1cae4e10674c706bddca7ce8_8795",
        url: "assets/data/acv/Gotham.acv",
      },
      {
        revision: "f4865108f571db9399f7b880a3db9f5a_8795",
        url: "assets/data/acv/Hefe.acv",
      },
      {
        revision: "8cab44265c4723b6162caa2d7cc3c462_8795",
        url: "assets/data/acv/Lord Kelvin.acv",
      },
      {
        revision: "687573286c95a5b6f66acfef2a2a7cac_8795",
        url: "assets/data/acv/Nashville.acv",
      },
      {
        revision: "4d35060764031028de0ff708e15be48d_8795",
        url: "assets/data/acv/X-PRO II.acv",
      },
      {
        revision: "4734933006095abaf8171900dcffb3af_8795",
        url: "assets/data/check_previews.html",
      },
      {
        revision: "89526d0b6ce3425186cccb1f1afb4e42_8795",
        url: "assets/data/countries.json",
      },
      {
        revision: "ea55266e7712cf4b173656d84b8eb74d_8795",
        url: "assets/data/fonts-update.xml",
      },
      {
        revision: "ea860b2b19f486a4399e8a3dd76b86ba_8795",
        url: "assets/data/fonts.air",
      },
      {
        revision: "b47d28060bfa62f0f01cc64357e8d18d_8795",
        url: "assets/data/google_previews/previews0.json",
      },
      {
        revision: "97b6f1e2fe42d8e812174f4bf42bc932_8795",
        url: "assets/data/google_previews/previews1.json",
      },
      {
        revision: "4a75df1dc0e58221ac4515dd8831102e_8795",
        url: "assets/data/google_previews/previews10.json",
      },
      {
        revision: "c8cc449ab3f7169efb92b7f04a996385_8795",
        url: "assets/data/google_previews/previews100.json",
      },
      {
        revision: "b8fa68a8207660d1f0629710f0f2fab7_8795",
        url: "assets/data/google_previews/previews101.json",
      },
      {
        revision: "32669c22880a164e3abc0c0f81765409_8795",
        url: "assets/data/google_previews/previews102.json",
      },
      {
        revision: "d629c2102e303674ff5701defc440170_8795",
        url: "assets/data/google_previews/previews103.json",
      },
      {
        revision: "9f860d020dbd314cc0eacaba46c671e9_8795",
        url: "assets/data/google_previews/previews104.json",
      },
      {
        revision: "dbfe473eb180775123873513f44d3d28_8795",
        url: "assets/data/google_previews/previews105.json",
      },
      {
        revision: "dcf9056b400828bea24393a53dd51fc2_8795",
        url: "assets/data/google_previews/previews106.json",
      },
      {
        revision: "3e139a77536d424397a17aa9fba31d7f_8795",
        url: "assets/data/google_previews/previews107.json",
      },
      {
        revision: "07e8fe8c44cf9a97adca2a6cc29d159c_8795",
        url: "assets/data/google_previews/previews108.json",
      },
      {
        revision: "cc529e0bbe348ca8dae339ae82bf01e0_8795",
        url: "assets/data/google_previews/previews109.json",
      },
      {
        revision: "7c6b4b645b93e5cb32ae80084d1ada0c_8795",
        url: "assets/data/google_previews/previews11.json",
      },
      {
        revision: "7528c44ccc319dde5be994913cd8ef9c_8795",
        url: "assets/data/google_previews/previews110.json",
      },
      {
        revision: "36abd167bdb5a4510f0ca79b09a4409d_8795",
        url: "assets/data/google_previews/previews111.json",
      },
      {
        revision: "aea9072c7f3fbab9928bd70bc87b2d35_8795",
        url: "assets/data/google_previews/previews112.json",
      },
      {
        revision: "6acd5e2566f5f78b93c0bacd91a1e6eb_8795",
        url: "assets/data/google_previews/previews113.json",
      },
      {
        revision: "4a972b02e0523fb8d32e278fdc2faad7_8795",
        url: "assets/data/google_previews/previews114.json",
      },
      {
        revision: "a93ca9f434db3a0898643b1f8751ec62_8795",
        url: "assets/data/google_previews/previews115.json",
      },
      {
        revision: "887a775f5a7332bf17d9e612e4ef8cc3_8795",
        url: "assets/data/google_previews/previews116.json",
      },
      {
        revision: "2d3665e39473d1496f1a3c76a9067355_8795",
        url: "assets/data/google_previews/previews117.json",
      },
      {
        revision: "3867df34c07cbd711b613e2e9ef7a839_8795",
        url: "assets/data/google_previews/previews118.json",
      },
      {
        revision: "4d2981e78c1f47d531383d398198c6f3_8795",
        url: "assets/data/google_previews/previews119.json",
      },
      {
        revision: "b99aff48a39a731b3c86b5178650c4f9_8795",
        url: "assets/data/google_previews/previews12.json",
      },
      {
        revision: "a4a7cfec09d5e50ed1ce310348f337e9_8795",
        url: "assets/data/google_previews/previews120.json",
      },
      {
        revision: "e2d1c33aee8c54dd6fdd81d6740bf5d1_8795",
        url: "assets/data/google_previews/previews121.json",
      },
      {
        revision: "e9c2ce9b43ec3831711c534ff27b4e34_8795",
        url: "assets/data/google_previews/previews122.json",
      },
      {
        revision: "2bd37dfdb8fca891a04ac56986a35025_8795",
        url: "assets/data/google_previews/previews123.json",
      },
      {
        revision: "7a6c56bfeccdab8d94722dc8bfaf5b73_8795",
        url: "assets/data/google_previews/previews124.json",
      },
      {
        revision: "95bc9a6ea634d7cfdd9c1bce6b0d8679_8795",
        url: "assets/data/google_previews/previews125.json",
      },
      {
        revision: "e17a034ea2dedd6de1996f2ffca22b09_8795",
        url: "assets/data/google_previews/previews126.json",
      },
      {
        revision: "817c438fad56853e242b79800ff5a5ae_8795",
        url: "assets/data/google_previews/previews127.json",
      },
      {
        revision: "4dcda0d1052474b06c24331b0f959eaf_8795",
        url: "assets/data/google_previews/previews128.json",
      },
      {
        revision: "3dc9a632e17ae8f721e1faa204460f84_8795",
        url: "assets/data/google_previews/previews129.json",
      },
      {
        revision: "e6573bfdbfe4633232bbb8059d8b76c4_8795",
        url: "assets/data/google_previews/previews13.json",
      },
      {
        revision: "653720c80fdab0c810d2408756256786_8795",
        url: "assets/data/google_previews/previews130.json",
      },
      {
        revision: "b46c7644cc45ce4f65df6ef9daf3db78_8795",
        url: "assets/data/google_previews/previews14.json",
      },
      {
        revision: "ccbee7be881a463a27383296ec0456d6_8795",
        url: "assets/data/google_previews/previews15.json",
      },
      {
        revision: "4b69b79519a62f404da5cf5aa8e6e86d_8795",
        url: "assets/data/google_previews/previews16.json",
      },
      {
        revision: "00496ed1c9463a1e75752608df529df4_8795",
        url: "assets/data/google_previews/previews17.json",
      },
      {
        revision: "ef6058eaed73256e109948d84204d3af_8795",
        url: "assets/data/google_previews/previews18.json",
      },
      {
        revision: "0ea4b67da87555a011350e48c96269c8_8795",
        url: "assets/data/google_previews/previews19.json",
      },
      {
        revision: "ef56c3d576afec881ca8710212219dd1_8795",
        url: "assets/data/google_previews/previews2.json",
      },
      {
        revision: "a05dd51fc71a9c740dbc0e0307ab2772_8795",
        url: "assets/data/google_previews/previews20.json",
      },
      {
        revision: "2eb0bac66a57ee693a47c11243b9c380_8795",
        url: "assets/data/google_previews/previews21.json",
      },
      {
        revision: "f82f9f9ec14306ade0b205297e5bce46_8795",
        url: "assets/data/google_previews/previews22.json",
      },
      {
        revision: "9ab5b975d5856aa5f7517d9c1ed73045_8795",
        url: "assets/data/google_previews/previews23.json",
      },
      {
        revision: "243fd50091a9e9ef70b80ffce1af6975_8795",
        url: "assets/data/google_previews/previews24.json",
      },
      {
        revision: "903070cf4cb3638deb5d9bc5131d3870_8795",
        url: "assets/data/google_previews/previews25.json",
      },
      {
        revision: "2e4601dbc7cd221720727e99cf2e2a50_8795",
        url: "assets/data/google_previews/previews26.json",
      },
      {
        revision: "436724e7f10858cdb477de186a2378e4_8795",
        url: "assets/data/google_previews/previews27.json",
      },
      {
        revision: "a854fc98d301b0df78dfff8ae21e1319_8795",
        url: "assets/data/google_previews/previews28.json",
      },
      {
        revision: "39850dec1989cceaac856b0714a74984_8795",
        url: "assets/data/google_previews/previews29.json",
      },
      {
        revision: "db355b4f44e9aadeb105f0abd9c97894_8795",
        url: "assets/data/google_previews/previews3.json",
      },
      {
        revision: "7de31d3c03b3ba74adb3722cf6cae81e_8795",
        url: "assets/data/google_previews/previews30.json",
      },
      {
        revision: "cc31541076a100f9d87109b01e4f65e4_8795",
        url: "assets/data/google_previews/previews31.json",
      },
      {
        revision: "32d1544990399b2c4c87b26cfd0ec889_8795",
        url: "assets/data/google_previews/previews32.json",
      },
      {
        revision: "35d3c735e61c5bf4e2b12dc8bd6b3498_8795",
        url: "assets/data/google_previews/previews33.json",
      },
      {
        revision: "e8963769cd57928afe20587646c6261b_8795",
        url: "assets/data/google_previews/previews34.json",
      },
      {
        revision: "8dc1d497790d05ed9a3d15f0debd6ada_8795",
        url: "assets/data/google_previews/previews35.json",
      },
      {
        revision: "40c97bc0d35ddf84660d1372afa479e1_8795",
        url: "assets/data/google_previews/previews36.json",
      },
      {
        revision: "2fc20483a1cfea5c039514dce5bcf2f7_8795",
        url: "assets/data/google_previews/previews37.json",
      },
      {
        revision: "f2fca0a3692ea2ac80c5653bca7a1d9d_8795",
        url: "assets/data/google_previews/previews38.json",
      },
      {
        revision: "4f62a24e9dbfa87098d37d68c3d3880a_8795",
        url: "assets/data/google_previews/previews39.json",
      },
      {
        revision: "d8f38d2db466c441750364229462a97e_8795",
        url: "assets/data/google_previews/previews4.json",
      },
      {
        revision: "f76251c1fde3ddd9d6128f41ce9098e6_8795",
        url: "assets/data/google_previews/previews40.json",
      },
      {
        revision: "524759c04f8ac34a191bf30c594a4cef_8795",
        url: "assets/data/google_previews/previews41.json",
      },
      {
        revision: "4ae6acbeb058c814ee52092eb8568838_8795",
        url: "assets/data/google_previews/previews42.json",
      },
      {
        revision: "0d068d119761dcc6893538c243462d53_8795",
        url: "assets/data/google_previews/previews43.json",
      },
      {
        revision: "a33d0f83b4975dae4a3870787c162180_8795",
        url: "assets/data/google_previews/previews44.json",
      },
      {
        revision: "c03a7a35d3015a2103180fec90db8878_8795",
        url: "assets/data/google_previews/previews45.json",
      },
      {
        revision: "26a5e002cf6c18dae61157f3fbf93fb1_8795",
        url: "assets/data/google_previews/previews46.json",
      },
      {
        revision: "b8f517a9a0b391038457e843a458049a_8795",
        url: "assets/data/google_previews/previews47.json",
      },
      {
        revision: "2a1a7b1f0ee1d0c99f5500b47b8b7d13_8795",
        url: "assets/data/google_previews/previews48.json",
      },
      {
        revision: "b76a8907a725e8b92a8e4fb20e4deb14_8795",
        url: "assets/data/google_previews/previews49.json",
      },
      {
        revision: "9e933faa1c71b77fac36b5a890ee5898_8795",
        url: "assets/data/google_previews/previews5.json",
      },
      {
        revision: "be2d6b1b4c4c271d595fa0138b25e596_8795",
        url: "assets/data/google_previews/previews50.json",
      },
      {
        revision: "b971c22d76dc0257601ce46879db9766_8795",
        url: "assets/data/google_previews/previews51.json",
      },
      {
        revision: "06debe0639b3386935a8416dd8141535_8795",
        url: "assets/data/google_previews/previews52.json",
      },
      {
        revision: "4cbb1c563c6bc32a7dfd1149b1978033_8795",
        url: "assets/data/google_previews/previews53.json",
      },
      {
        revision: "402e4467069114d0ae860e1328055bd2_8795",
        url: "assets/data/google_previews/previews54.json",
      },
      {
        revision: "e03067ec46652640d4994d24b09a5c96_8795",
        url: "assets/data/google_previews/previews55.json",
      },
      {
        revision: "9287826561a9d1230fdd7f5c877d061d_8795",
        url: "assets/data/google_previews/previews56.json",
      },
      {
        revision: "7519c6bdf67c1e6af92610c1b15500e9_8795",
        url: "assets/data/google_previews/previews57.json",
      },
      {
        revision: "1318f5897cbb594787cba9aa0416474d_8795",
        url: "assets/data/google_previews/previews58.json",
      },
      {
        revision: "e787aa7f2326a3af25b8118ec3651c0d_8795",
        url: "assets/data/google_previews/previews59.json",
      },
      {
        revision: "6e03bea98c8ec857806635e06775826c_8795",
        url: "assets/data/google_previews/previews6.json",
      },
      {
        revision: "3983060fd1ab268b5cf901c5872450ff_8795",
        url: "assets/data/google_previews/previews60.json",
      },
      {
        revision: "f201d71929808c1ae11ce8fd8892b29e_8795",
        url: "assets/data/google_previews/previews61.json",
      },
      {
        revision: "01eb5784f2829f7b5cfe2127fdd36680_8795",
        url: "assets/data/google_previews/previews62.json",
      },
      {
        revision: "a745964058e284d43e36810628050d42_8795",
        url: "assets/data/google_previews/previews63.json",
      },
      {
        revision: "f437b3614431f9ddf1de75945f088075_8795",
        url: "assets/data/google_previews/previews64.json",
      },
      {
        revision: "439023c368fb32d73f89c739e6946d29_8795",
        url: "assets/data/google_previews/previews65.json",
      },
      {
        revision: "7bfc9d02599e363aef523aa2a3b8dd15_8795",
        url: "assets/data/google_previews/previews66.json",
      },
      {
        revision: "dbae25e25244761fb05e16680feedfa4_8795",
        url: "assets/data/google_previews/previews67.json",
      },
      {
        revision: "6132339a6a9ab7a98b6231c7093ba141_8795",
        url: "assets/data/google_previews/previews68.json",
      },
      {
        revision: "cfd22d63a4edb9fb267d2e6770d93886_8795",
        url: "assets/data/google_previews/previews69.json",
      },
      {
        revision: "822bdd3f8c560d7448bf93fda1a1e547_8795",
        url: "assets/data/google_previews/previews7.json",
      },
      {
        revision: "2627049874e3d8934e2a8c9dd437051b_8795",
        url: "assets/data/google_previews/previews70.json",
      },
      {
        revision: "bd1a937b81c785c725d360e11c78dd3a_8795",
        url: "assets/data/google_previews/previews71.json",
      },
      {
        revision: "167eea7003f55aadb330475cf37ba9b4_8795",
        url: "assets/data/google_previews/previews72.json",
      },
      {
        revision: "2cf79667f49bbd43ec3661d2915376ad_8795",
        url: "assets/data/google_previews/previews73.json",
      },
      {
        revision: "7393aa0f9fac87cf01fe4427b5b9ae7e_8795",
        url: "assets/data/google_previews/previews74.json",
      },
      {
        revision: "98675f868e7b348af9f6e74546df2b6c_8795",
        url: "assets/data/google_previews/previews75.json",
      },
      {
        revision: "1bc9d0a06adc71b5f9ae826e01fc90ed_8795",
        url: "assets/data/google_previews/previews76.json",
      },
      {
        revision: "edb41fc0d4a041d5106221f9a18ee768_8795",
        url: "assets/data/google_previews/previews77.json",
      },
      {
        revision: "cdc9e86ec820e561e7406c64b1a4c4d6_8795",
        url: "assets/data/google_previews/previews78.json",
      },
      {
        revision: "a67e00419f910dcbfa572ffd375a1834_8795",
        url: "assets/data/google_previews/previews79.json",
      },
      {
        revision: "5b7ab55b27a56136db72777e30107244_8795",
        url: "assets/data/google_previews/previews8.json",
      },
      {
        revision: "381cdfd5c6041c422279f9f79b80f4b4_8795",
        url: "assets/data/google_previews/previews80.json",
      },
      {
        revision: "d0f9009db0c9ea7c1c7392b90d562d47_8795",
        url: "assets/data/google_previews/previews81.json",
      },
      {
        revision: "81675ab1fb409480e5a7bc46188bbc11_8795",
        url: "assets/data/google_previews/previews82.json",
      },
      {
        revision: "5636570dedf4cf584a2deaf62c2bf1f5_8795",
        url: "assets/data/google_previews/previews83.json",
      },
      {
        revision: "417ff352fb965afec2f319ff80fbbc40_8795",
        url: "assets/data/google_previews/previews84.json",
      },
      {
        revision: "1efd38a8cbfacb2919d2e08394443122_8795",
        url: "assets/data/google_previews/previews85.json",
      },
      {
        revision: "07820280a33ce1acf8a494506b5f30b9_8795",
        url: "assets/data/google_previews/previews86.json",
      },
      {
        revision: "6ffee4825e9918704c64b61f83908ef7_8795",
        url: "assets/data/google_previews/previews87.json",
      },
      {
        revision: "939704409597560e4492c8a49e515174_8795",
        url: "assets/data/google_previews/previews88.json",
      },
      {
        revision: "a6b41539a556702afa5767a649fa6243_8795",
        url: "assets/data/google_previews/previews89.json",
      },
      {
        revision: "794db1d13a47fd22a07e41baca1845d5_8795",
        url: "assets/data/google_previews/previews9.json",
      },
      {
        revision: "148d8928e19c5d3d81576ab46aa1f677_8795",
        url: "assets/data/google_previews/previews90.json",
      },
      {
        revision: "9757ab105bba7e9ed85914e67877ba8a_8795",
        url: "assets/data/google_previews/previews91.json",
      },
      {
        revision: "ae262813f02c23361ad0fe750929c767_8795",
        url: "assets/data/google_previews/previews92.json",
      },
      {
        revision: "ce10e5f228a3249a2e90ca01c6288600_8795",
        url: "assets/data/google_previews/previews93.json",
      },
      {
        revision: "2997eea5fcb332d8c22e78f581481349_8795",
        url: "assets/data/google_previews/previews94.json",
      },
      {
        revision: "98ca2ab29ea78bae4b6881f99feb4858_8795",
        url: "assets/data/google_previews/previews95.json",
      },
      {
        revision: "be0c50a41459c33e20ca77a873897e6b_8795",
        url: "assets/data/google_previews/previews96.json",
      },
      {
        revision: "a0feb340d70337c685f66fbe1ee2d8e0_8795",
        url: "assets/data/google_previews/previews97.json",
      },
      {
        revision: "abfe029073c45a7255ddb355c0c63820_8795",
        url: "assets/data/google_previews/previews98.json",
      },
      {
        revision: "396b565898f35198e64737efd5380628_8795",
        url: "assets/data/google_previews/previews99.json",
      },
      {
        revision: "4e1194ff93bf37061b8d8af105855aa3_8795",
        url: "assets/data/googlefonts.json",
      },
      {
        revision: "79d7e984ea3ac74eed7cc92bf6b22a0d_8795",
        url: "assets/data/icc/USWebCoatedSWOP.icc",
      },
      {
        revision: "3b1543b7988939314871bb4403688ce1_8795",
        url: "assets/data/launcher.swf",
      },
      {
        revision: "78eb13d7387505cdc5f23db0536d6122_8795",
        url: "assets/data/previews.7z",
      },
      {
        revision: "486e4ff9ead7d94e79882adea7efca94_8795",
        url: "assets/data/update_fonts.js",
      },
      {
        revision: "290e86f456d644667147583f36b4057a_8795",
        url: "assets/font/chinese-simplified/NotoSans.svg",
      },
      {
        revision: "e3f19cbf93383af71ea78e490097f6dd_8795",
        url: "assets/font/chinese-simplified/NotoSansCJKsc-Bold.otf",
      },
      {
        revision: "cca5efc0e02fb1bf62349bd68ef30fc1_8795",
        url: "assets/font/chinese-simplified/NotoSansCJKsc-Regular.otf",
      },
      {
        revision: "c83184f62e12039f698bb70edf0db9e7_8795",
        url: "assets/font/chinese-traditional/NotoSans.svg",
      },
      {
        revision: "e0784e6f75aa2d493093b3513192df29_8795",
        url: "assets/font/chinese-traditional/NotoSansCJKtc-Bold.otf",
      },
      {
        revision: "8c01889e307b677a5a32f455df84375d_8795",
        url: "assets/font/chinese-traditional/NotoSansCJKtc-Regular.otf",
      },
      {
        revision: "d716673ab38bd23b13e8a337d735bb9c_8795",
        url: "assets/font/gravit-designer.eot",
      },
      {
        revision: "183087d9927a37d48c5d0d0494b60833_8795",
        url: "assets/font/gravit-designer.svg",
      },
      {
        revision: "c0289744de7f7824876c0733e3e04270_8795",
        url: "assets/font/gravit-designer.ttf",
      },
      {
        revision: "223924ebb3453ea5684ec294b7f1ab1a_8795",
        url: "assets/font/gravit-designer.woff",
      },
      {
        revision: "6614f344e7c8dd0f3f883991088e4656_8795",
        url: "assets/font/japan/NotoSans.svg",
      },
      {
        revision: "6614f344e7c8dd0f3f883991088e4656_8795",
        url: "assets/font/korean/NotoSans.svg",
      },
      {
        revision: "cccb897485813c7c256901dbca54ecf2_8795",
        url: "assets/font/Lato-Bold.woff2",
      },
      {
        revision: "7244318390cc4d36aac4a613ff42d308_8795",
        url: "assets/font/Lato-Light.woff2",
      },
      {
        revision: "bd03a2cc277bbbc338d464e679fe9942_8795",
        url: "assets/font/Lato-Regular.woff2",
      },
      {
        revision: "8b4f872c5de19974857328d06d3fe48f_8795",
        url: "assets/font/Lato-Semibold.woff2",
      },
      {
        revision: "d968e6f6cb5b69b502f91e9035e80708_8795",
        url: "assets/font/noto/fontlist.json",
      },
      {
        revision: "55719faa0112708e946b820b24b14097_8795",
        url: "assets/font/noto/LICENSE_OFL.txt",
      },
      {
        revision: "b27cc0582b23eea7b5d3f16086425d5a_8795",
        url: "assets/font/noto/makefontlist.js",
      },
      {
        revision: "ad99900806fe40aaec417f9c06782fe0_8795",
        url: "assets/font/noto/NotoSansAdlam-Regular.svg",
      },
      {
        revision: "836cb3ef47b909aafa0cc15f0f4229e6_8795",
        url: "assets/font/noto/NotoSansAdlam-Regular.ttf",
      },
      {
        revision: "793944f4ca6e09ce8703078ce3841526_8795",
        url: "assets/font/noto/NotoSansArabic-Bold.ttf",
      },
      {
        revision: "3385fe3dce81b1afdd7ba251b3cc2002_8795",
        url: "assets/font/noto/NotoSansArabic-Regular.svg",
      },
      {
        revision: "9f563abf8532ead724f2d6231983b5d4_8795",
        url: "assets/font/noto/NotoSansArabic-Regular.ttf",
      },
      {
        revision: "136c5efcf4618d626b631505b9005f8a_8795",
        url: "assets/font/noto/NotoSansArmenian-Bold.ttf",
      },
      {
        revision: "b04a56c4c7facd9a76aac32bb549f8c4_8795",
        url: "assets/font/noto/NotoSansArmenian-Regular.svg",
      },
      {
        revision: "e3302ff68d6e9056c8778ff5a78389ea_8795",
        url: "assets/font/noto/NotoSansArmenian-Regular.ttf",
      },
      {
        revision: "30408959a9c0af34c6416c835fd7c408_8795",
        url: "assets/font/noto/NotoSansAvestan-Regular.svg",
      },
      {
        revision: "2f46591b15480ab76448faf977642054_8795",
        url: "assets/font/noto/NotoSansAvestan-Regular.ttf",
      },
      {
        revision: "aee5573d0e2b4ed3a4ef7bbe1a108b08_8795",
        url: "assets/font/noto/NotoSansBalinese-Regular.svg",
      },
      {
        revision: "4328dd92868390484d4918879243a531_8795",
        url: "assets/font/noto/NotoSansBalinese-Regular.ttf",
      },
      {
        revision: "b009e41821c874dbb232feea80ec7608_8795",
        url: "assets/font/noto/NotoSansBamum-Regular.svg",
      },
      {
        revision: "10ba5cd11e1e6562e9769e73496073ce_8795",
        url: "assets/font/noto/NotoSansBamum-Regular.ttf",
      },
      {
        revision: "7a97c043ca0951233f28577c99ea0498_8795",
        url: "assets/font/noto/NotoSansBatak-Regular.svg",
      },
      {
        revision: "99572ed33969946b286854b6d389a53b_8795",
        url: "assets/font/noto/NotoSansBatak-Regular.ttf",
      },
      {
        revision: "a3d5337b9b35655aafd85da21948ee0d_8795",
        url: "assets/font/noto/NotoSansBengali-Bold.ttf",
      },
      {
        revision: "2eed05fde9a7bec5ad7b8208dadd0531_8795",
        url: "assets/font/noto/NotoSansBengali-Regular.svg",
      },
      {
        revision: "bc4717e7e7f86cbe13a4a721fd4b5137_8795",
        url: "assets/font/noto/NotoSansBengali-Regular.ttf",
      },
      {
        revision: "104c1131fa3328c2d9fa896ea2f6261c_8795",
        url: "assets/font/noto/NotoSansBrahmi-Regular.svg",
      },
      {
        revision: "1bc0f26e3c17bbff56c2c4b7021dedf4_8795",
        url: "assets/font/noto/NotoSansBrahmi-Regular.ttf",
      },
      {
        revision: "cda7aad07d03361fd014fa3333db826a_8795",
        url: "assets/font/noto/NotoSansBuginese-Regular.svg",
      },
      {
        revision: "c1640bfc90dda85dd18e547b4f079c36_8795",
        url: "assets/font/noto/NotoSansBuginese-Regular.ttf",
      },
      {
        revision: "c6f46ee3a3e01dfac0746d26e3e43395_8795",
        url: "assets/font/noto/NotoSansBuhid-Regular.svg",
      },
      {
        revision: "5b7e8c08ba7a28920ae174db997a67a9_8795",
        url: "assets/font/noto/NotoSansBuhid-Regular.ttf",
      },
      {
        revision: "916295311eb103bfb67a2d2a5824b662_8795",
        url: "assets/font/noto/NotoSansCham-Bold.svg",
      },
      {
        revision: "5f58c2004c27475049de5e927c0208dc_8795",
        url: "assets/font/noto/NotoSansCham-Bold.ttf",
      },
      {
        revision: "be94240f3a53c081a15b74b624ed7119_8795",
        url: "assets/font/noto/NotoSansCham-Regular.svg",
      },
      {
        revision: "97d232ac30d01e4b6aaa763e0374d915_8795",
        url: "assets/font/noto/NotoSansCham-Regular.ttf",
      },
      {
        revision: "9e450b93c267928a4c0cb2269b7b1d7f_8795",
        url: "assets/font/noto/NotoSansCherokee-Bold.ttf",
      },
      {
        revision: "b33f4aa21a20fe0b13fb85f2ed0a86e0_8795",
        url: "assets/font/noto/NotoSansCherokee-Regular.svg",
      },
      {
        revision: "dcc5f1e23aab598a7a2efd2b76cb799f_8795",
        url: "assets/font/noto/NotoSansCherokee-Regular.ttf",
      },
      {
        revision: "1805644d0919a80051e76e1fc750a189_8795",
        url: "assets/font/noto/NotoSansCJKjp-Bold.otf",
      },
      {
        revision: "3b5ac35aecb807201a6da82212cab235_8795",
        url: "assets/font/noto/NotoSansCJKjp-Bold.svg",
      },
      {
        revision: "7ed4b9a7daaf1d1c71903a92059434fb_8795",
        url: "assets/font/noto/NotoSansCJKjp-Regular.otf",
      },
      {
        revision: "1aca59a9ad494ddfe4344ddd9c9a0ad4_8795",
        url: "assets/font/noto/NotoSansCJKjp-Regular.svg",
      },
      {
        revision: "79d613fb8ec20fbb6bfcbf64e93cc9b2_8795",
        url: "assets/font/noto/NotoSansCJKkr-Bold.otf",
      },
      {
        revision: "3b5ac35aecb807201a6da82212cab235_8795",
        url: "assets/font/noto/NotoSansCJKkr-Bold.svg",
      },
      {
        revision: "19b7d8d4011e8f88930022704558246d_8795",
        url: "assets/font/noto/NotoSansCJKkr-Regular.otf",
      },
      {
        revision: "1aca59a9ad494ddfe4344ddd9c9a0ad4_8795",
        url: "assets/font/noto/NotoSansCJKkr-Regular.svg",
      },
      {
        revision: "ad20b2e6538046e0a9cd6d527eb7f106_8795",
        url: "assets/font/noto/NotoSansCoptic-Regular.svg",
      },
      {
        revision: "eef352753cf4e72ae6f4748b72043784_8795",
        url: "assets/font/noto/NotoSansCoptic-Regular.ttf",
      },
      {
        revision: "02511ffed9091409a76ff1e42cd4d84d_8795",
        url: "assets/font/noto/NotoSansDevanagari-Bold.ttf",
      },
      {
        revision: "d5305606ebf117acc5d4e55a0bb8d060_8795",
        url: "assets/font/noto/NotoSansDevanagari-Regular.svg",
      },
      {
        revision: "b69532e00c9829a8da999015d8476aa2_8795",
        url: "assets/font/noto/NotoSansDevanagari-Regular.ttf",
      },
      {
        revision: "b6db10f5065949cbbec76a8a43d81ec1_8795",
        url: "assets/font/noto/NotoSansGeorgian-Bold.ttf",
      },
      {
        revision: "7c3dc62782de2b8c416d2dd041e18038_8795",
        url: "assets/font/noto/NotoSansGeorgian-Regular.svg",
      },
      {
        revision: "fdd15a9ba438b8ff71433b8b7c0d1831_8795",
        url: "assets/font/noto/NotoSansGeorgian-Regular.ttf",
      },
      {
        revision: "c778231fe6f8c785f0068517ae047895_8795",
        url: "assets/font/noto/NotoSansHebrew-Bold.ttf",
      },
      {
        revision: "2a51b1d83e1f26abd85fa2b3b90de50d_8795",
        url: "assets/font/noto/NotoSansHebrew-Regular.svg",
      },
      {
        revision: "7867ab331bc13c84b5b31fdacb3e3ba3_8795",
        url: "assets/font/noto/NotoSansHebrew-Regular.ttf",
      },
      {
        revision: "caa49070a636fa1d6a7b74c971a68e55_8795",
        url: "assets/font/noto/NotoSansJavanese-Regular.svg",
      },
      {
        revision: "8db149bf14faa4a064f100202eb18742_8795",
        url: "assets/font/noto/NotoSansJavanese-Regular.ttf",
      },
      {
        revision: "85cfb4e88fc6e8cd4239820c92eefa4c_8795",
        url: "assets/font/noto/NotoSansKaithi-Regular.svg",
      },
      {
        revision: "5dff3b6ec12e63ca19b4c99f99e37baa_8795",
        url: "assets/font/noto/NotoSansKaithi-Regular.ttf",
      },
      {
        revision: "ecb73738b15d9c1826a70a4253bedd27_8795",
        url: "assets/font/noto/NotoSansKannada-Bold.ttf",
      },
      {
        revision: "f4cac503e965620d4306d9874fdc7b9a_8795",
        url: "assets/font/noto/NotoSansKannada-Regular.svg",
      },
      {
        revision: "455c8452c925d5b900715919b2f5623e_8795",
        url: "assets/font/noto/NotoSansKannada-Regular.ttf",
      },
      {
        revision: "08c62750d7e19aadf00308747a478c9f_8795",
        url: "assets/font/noto/NotoSansKayahLi-Regular.ttf",
      },
      {
        revision: "22c74a105953b63080d8d936983d8ab3_8795",
        url: "assets/font/noto/NotoSansKhmer-Bold.ttf",
      },
      {
        revision: "1f9516242eff1b5900677875acc45266_8795",
        url: "assets/font/noto/NotoSansKhmer-Regular.svg",
      },
      {
        revision: "0afc4071f75f43af2ac140e8846d9684_8795",
        url: "assets/font/noto/NotoSansKhmer-Regular.ttf",
      },
      {
        revision: "0f89abc2f43273a0b47c3649f525d3b8_8795",
        url: "assets/font/noto/NotoSansLao-Bold.ttf",
      },
      {
        revision: "eee0ded0a8d3e3b052eaea5380ec2c8d_8795",
        url: "assets/font/noto/NotoSansLao-Regular.svg",
      },
      {
        revision: "7b4cacd709b65605c606a30007f08875_8795",
        url: "assets/font/noto/NotoSansLao-Regular.ttf",
      },
      {
        revision: "986f8d33490b8332de68a5a6fa856d2b_8795",
        url: "assets/font/noto/NotoSansLepcha-Regular.svg",
      },
      {
        revision: "5c8fe56c602a9730777dd9a33f613322_8795",
        url: "assets/font/noto/NotoSansLepcha-Regular.ttf",
      },
      {
        revision: "34f0506d00bb6b997da12bce765e5598_8795",
        url: "assets/font/noto/NotoSansLimbu-Regular.svg",
      },
      {
        revision: "a371f0ac0b6a784d8d00675bce4d2d85_8795",
        url: "assets/font/noto/NotoSansLimbu-Regular.ttf",
      },
      {
        revision: "7faf9676fd2d17aac1b497a14f046773_8795",
        url: "assets/font/noto/NotoSansLinearB-Regular.svg",
      },
      {
        revision: "4262caae13347a682691b173f5a1279d_8795",
        url: "assets/font/noto/NotoSansLinearB-Regular.ttf",
      },
      {
        revision: "5afc707bd73428d526d5502f6597fce0_8795",
        url: "assets/font/noto/NotoSansMalayalam-Bold.ttf",
      },
      {
        revision: "2cca6c67689adce5b8a70c0a8fb13f1e_8795",
        url: "assets/font/noto/NotoSansMalayalam-Regular.svg",
      },
      {
        revision: "10749ea1f748cfaa131e4f6a48125735_8795",
        url: "assets/font/noto/NotoSansMalayalam-Regular.ttf",
      },
      {
        revision: "e4172f589056dde05bd1adbefb3ffd75_8795",
        url: "assets/font/noto/NotoSansMandaic-Regular.svg",
      },
      {
        revision: "4868f455a042589fbc5dbfaf5571b525_8795",
        url: "assets/font/noto/NotoSansMandaic-Regular.ttf",
      },
      {
        revision: "823ee95368b5c43bc333aab978013ff1_8795",
        url: "assets/font/noto/NotoSansMongolian-Regular.svg",
      },
      {
        revision: "4acab5b0e758121b5c47636459b7d15b_8795",
        url: "assets/font/noto/NotoSansMongolian-Regular.ttf",
      },
      {
        revision: "4b172b164326487e5ae8dad60edcaa78_8795",
        url: "assets/font/noto/NotoSansMyanmar-Bold.ttf",
      },
      {
        revision: "68bda9e4c66b053443adc5957beb5478_8795",
        url: "assets/font/noto/NotoSansMyanmar-Regular.svg",
      },
      {
        revision: "e2e25ce7172ab59f77327898a07c1293_8795",
        url: "assets/font/noto/NotoSansMyanmar-Regular.ttf",
      },
      {
        revision: "ed589ed0f92af9ef74ba19f8c04f9c33_8795",
        url: "assets/font/noto/NotoSansOldPersian-Regular.svg",
      },
      {
        revision: "fbcb29784a8f66353317a5a0e8619249_8795",
        url: "assets/font/noto/NotoSansOldPersian-Regular.ttf",
      },
      {
        revision: "38f1fc425bdf0483a2c20948b7c95d3a_8795",
        url: "assets/font/noto/NotoSansOsmanya-Regular.svg",
      },
      {
        revision: "05a38a8fcec57fb2b3462408767f5f53_8795",
        url: "assets/font/noto/NotoSansOsmanya-Regular.ttf",
      },
      {
        revision: "19c945a214a84e28c76b0b795bea83c9_8795",
        url: "assets/font/noto/NotoSansPhoenician-Regular.svg",
      },
      {
        revision: "7528409375aafa8880f5bc18a1dd4b0a_8795",
        url: "assets/font/noto/NotoSansPhoenician-Regular.ttf",
      },
      {
        revision: "091ec3beadd53d881700953de233d626_8795",
        url: "assets/font/noto/NotoSansRunic-Regular.svg",
      },
      {
        revision: "66179b9e1b17ae131bc53c4c01e9bbbc_8795",
        url: "assets/font/noto/NotoSansRunic-Regular.ttf",
      },
      {
        revision: "8d9c7a1ef365ed2316bb03372958d709_8795",
        url: "assets/font/noto/NotoSansSundanese-Regular.svg",
      },
      {
        revision: "e7cec3ec1c44a7db023528a409f3e6bc_8795",
        url: "assets/font/noto/NotoSansSundanese-Regular.ttf",
      },
      {
        revision: "e33b6c33f7940314c8aab71878046907_8795",
        url: "assets/font/noto/NotoSansSyriacEastern-Regular.svg",
      },
      {
        revision: "0236b293aef3a242e53284d28bfaeada_8795",
        url: "assets/font/noto/NotoSansSyriacEastern-Regular.ttf",
      },
      {
        revision: "63f6b7ad2af805dbe9c6ecf58bdf1187_8795",
        url: "assets/font/noto/NotoSansSyriacEstrangela-Regular.svg",
      },
      {
        revision: "2b390ad77a8f65f0f024c582ef5dc910_8795",
        url: "assets/font/noto/NotoSansSyriacEstrangela-Regular.ttf",
      },
      {
        revision: "f76aad77faed2fb0c2b82876ebcd90b1_8795",
        url: "assets/font/noto/NotoSansSyriacWestern-Regular.svg",
      },
      {
        revision: "650508cdb05ff6b49e4cb0d6a7ed911d_8795",
        url: "assets/font/noto/NotoSansSyriacWestern-Regular.ttf",
      },
      {
        revision: "40afd2112d5f84314ff7155dcf9bf091_8795",
        url: "assets/font/noto/NotoSansTagalog-Regular.svg",
      },
      {
        revision: "aa3b371c448549d60e18649c3381ec21_8795",
        url: "assets/font/noto/NotoSansTagalog-Regular.ttf",
      },
      {
        revision: "9b0b79ddf00129ffddf597d1344ffeed_8795",
        url: "assets/font/noto/NotoSansTaiTham-Regular.svg",
      },
      {
        revision: "2edfd3e4e1461b27c00fe1e2f5bf42f5_8795",
        url: "assets/font/noto/NotoSansTaiTham-Regular.ttf",
      },
      {
        revision: "445f67bee0817180b27cc5d727e6da63_8795",
        url: "assets/font/noto/NotoSansTaiViet-Regular.svg",
      },
      {
        revision: "7066e75f1c56114c30e42465a3a9ee72_8795",
        url: "assets/font/noto/NotoSansTaiViet-Regular.ttf",
      },
      {
        revision: "7d06e46555ff57ad5c44050a72c697f7_8795",
        url: "assets/font/noto/NotoSansTelugu-Bold.ttf",
      },
      {
        revision: "738d41ce6b84db8373cfdbbdb4cd70c6_8795",
        url: "assets/font/noto/NotoSansTelugu-Regular.svg",
      },
      {
        revision: "b31aedd2fc41242944b23ac514e04dbf_8795",
        url: "assets/font/noto/NotoSansTelugu-Regular.ttf",
      },
      {
        revision: "84b81463f0e0d6329dc89eb3d0249ad3_8795",
        url: "assets/font/noto/NotoSansThai-Bold.ttf",
      },
      {
        revision: "478c7926839a3dd2dab0e599c0d80c1a_8795",
        url: "assets/font/noto/NotoSansThai-Regular.svg",
      },
      {
        revision: "3b8502f42413342d3cb1c5bfac2d8052_8795",
        url: "assets/font/noto/NotoSansThai-Regular.ttf",
      },
      {
        revision: "5f7ac78f4a2088593d6c1edd830e1b07_8795",
        url: "assets/font/noto/NotoSansTibetan-Bold.ttf",
      },
      {
        revision: "d1a5e2e6c4bcb1de2176c12795775e6b_8795",
        url: "assets/font/noto/NotoSansTibetan-Regular.svg",
      },
      {
        revision: "9e9ee102381482b3fcf06faac5f731e5_8795",
        url: "assets/font/noto/NotoSansTibetan-Regular.ttf",
      },
      {
        revision: "f271513aff741b47a14b9d7d19d914a0_8795",
        url: "assets/font/noto/NotoSansYi-Regular.svg",
      },
      {
        revision: "6792c02c916182f881fc3e4d8187cd6a_8795",
        url: "assets/font/noto/NotoSansYi-Regular.ttf",
      },
      {
        revision: "69f077eaa4e7541f075da090955ebebc_8795",
        url: "assets/font/noto/undetected/NotoSansTaiLe-Regular.svg",
      },
      {
        revision: "005dba5960baad8df7f4dba53bfff9c7_8795",
        url: "assets/font/noto/undetected/NotoSansTaiLe-Regular.ttf",
      },
      {
        revision: "50145685042b4df07a1fd19957275b81_8795",
        url: "assets/font/OpenSans-Bold.ttf",
      },
      {
        revision: "78b08a68d05d5fabb0b8effd51bf6ade_8795",
        url: "assets/font/OpenSans-BoldItalic.ttf",
      },
      {
        revision: "8bac22ed4fd7c8a30536be18e2984f84_8795",
        url: "assets/font/OpenSans-ExtraBold.ttf",
      },
      {
        revision: "73d6bb0d4f596a91992e6be32e82e3bc_8795",
        url: "assets/font/OpenSans-ExtraBoldItalic.ttf",
      },
      {
        revision: "c7dcce084c445260a266f92db56f5517_8795",
        url: "assets/font/OpenSans-Italic.ttf",
      },
      {
        revision: "1bf71be111189e76987a4bb9b3115cb7_8795",
        url: "assets/font/OpenSans-Light.ttf",
      },
      {
        revision: "6943fb6fd4200f3d073469325c6acdc9_8795",
        url: "assets/font/OpenSans-LightItalic.ttf",
      },
      {
        revision: "629a55a7e793da068dc580d184cc0e31_8795",
        url: "assets/font/OpenSans-Regular.ttf",
      },
      {
        revision: "33f225b8f5f7d6b34a0926f58f96c1e9_8795",
        url: "assets/font/OpenSans-SemiBold.ttf",
      },
      {
        revision: "73f7301a9cd7a086295401eefe0c998f_8795",
        url: "assets/font/OpenSans-SemiBoldItalic.ttf",
      },
      {
        revision: "31ef0982307f2635293045342776a368_8795",
        url: "assets/font/OpenSans.svg",
      },
      {
        revision: "574fd0b50367f886d359e8264938fc37_8795",
        url: "assets/font/Roboto-Medium.woff2",
      },
      {
        revision: "efb849403f1e078172db2a6d59b36624_8795",
        url: "assets/help/drag-with-2-fingers.svg",
      },
      {
        revision: "60c6fac7ec4111d83b2642d7921fadca_8795",
        url: "assets/help/pinch-to-zoom.svg",
      },
      {
        revision: "0bddda64f65dfdc861d33b526dca6190_8795",
        url: "assets/help/tap-and-holder.svg",
      },
      {
        revision: "75423809376da28cf4c57954a25cab0b_8795",
        url: "assets/icon/3-dots.svg",
      },
      {
        revision: "447c5803c62313a1fdbceb19bc7ecc23_8795",
        url: "assets/icon/account.svg",
      },
      {
        revision: "ad6cac891757f763d88cff84eaf8876c_8795",
        url: "assets/icon/add-swatches.svg",
      },
      {
        revision: "0aa7f73ce27494fa4ffce38354f8b558_8795",
        url: "assets/icon/adjust.jpg",
      },
      {
        revision: "185d60ce9641c86931cdb9ab98681732_8795",
        url: "assets/icon/alcohol.jpg",
      },
      {
        revision: "23034d6c93f5604c9034b740657e8764_8795",
        url: "assets/icon/annotation/dropdown-icon-light.svg",
      },
      {
        revision: "fcc236afb0791a8aedbd37b26ea3a7e5_8795",
        url: "assets/icon/annotation/dropdown-icon.svg",
      },
      {
        revision: "09d0554b7d8c9afd40c2d24e343377c1_8795",
        url: "assets/icon/annotation/info-light.svg",
      },
      {
        revision: "22ed731bf028c8b67f45efaf90b712c3_8795",
        url: "assets/icon/annotation/info.svg",
      },
      {
        revision: "724de7561255ce23dbab31f935fc20a0_8795",
        url: "assets/icon/annotation/selected-light.svg",
      },
      {
        revision: "5f85711a4e2601f16e74c729d44c2cd7_8795",
        url: "assets/icon/annotation/selected.svg",
      },
      {
        revision: "0cdaad7e2170671f11374844ce4c8113_8795",
        url: "assets/icon/avatar-comment-dark.svg",
      },
      {
        revision: "d8f389a630c27815eafeb1d351b323ed_8795",
        url: "assets/icon/avatar-comment-light.svg",
      },
      {
        revision: "4a82165db75db4c735c07370872279f0_8795",
        url: "assets/icon/avatar.svg",
      },
      {
        revision: "98d5d83cbd703363d59a22798e1da185_8795",
        url: "assets/icon/back_white.svg",
      },
      {
        revision: "c03267e50b02d50a5327c9f6ba133b63_8795",
        url: "assets/icon/back.svg",
      },
      {
        revision: "aa95ca6ed0a293e3c231ff7b106a09dd_8795",
        url: "assets/icon/bend.jpg",
      },
      {
        revision: "ecf1a7209b2b8e13d5e661e3876f574f_8795",
        url: "assets/icon/bloom.jpg",
      },
      {
        revision: "ebe6cadd290bdeba694d5bda4096607f_8795",
        url: "assets/icon/blur.jpg",
      },
      {
        revision: "dc4ae65ddbf789ceaacc55412fba31c0_8795",
        url: "assets/icon/bulge.jpg",
      },
      {
        revision: "d3c2550708a272a3f0f5551c49c7533b_8795",
        url: "assets/icon/bullets-1-dark.svg",
      },
      {
        revision: "09104f4361f631244c05ba864cd77af4_8795",
        url: "assets/icon/bullets-1.svg",
      },
      {
        revision: "59a2cae857aa9ea28bb400129819537d_8795",
        url: "assets/icon/bullets-2-dark.svg",
      },
      {
        revision: "28e8400a227f03b9dc469e69ebe95016_8795",
        url: "assets/icon/bullets-2.svg",
      },
      {
        revision: "7581c6a041a36bc8b922096b83d39917_8795",
        url: "assets/icon/bullets-3-dark.svg",
      },
      {
        revision: "ae16a246e04168132c0f8ead574655c3_8795",
        url: "assets/icon/bullets-3.svg",
      },
      {
        revision: "976b8d2da51bb49a1597e3d3f24e2e5a_8795",
        url: "assets/icon/change-password.svg",
      },
      {
        revision: "1082159a6d6000212c5607f447276556_8795",
        url: "assets/icon/check.svg",
      },
      {
        revision: "e8dd9b80346b237b3a7175f54226a546_8795",
        url: "assets/icon/cloud_icon.svg",
      },
      {
        revision: "c4467b05aac2a2fa076837c03a37464a_8795",
        url: "assets/icon/collaborators.svg",
      },
      {
        revision: "e4afc962e24d7293beeeda9e4f7c65d0_8795",
        url: "assets/icon/color_grading.jpg",
      },
      {
        revision: "1eb4e900a49603c2a5c366e8e0238a14_8795",
        url: "assets/icon/color-stop-handle.svg",
      },
      {
        revision: "b217489d6976b97754adf1128957852c_8795",
        url: "assets/icon/comment.svg",
      },
      {
        revision: "0d6a0b5f8f64e3cd98ef88770ea9a8a9_8795",
        url: "assets/icon/contact_shadow.jpg",
      },
      {
        revision: "b7ad5ae6fb82c3191408d0e9d84126e4_8795",
        url: "assets/icon/curved_shadow.jpg",
      },
      {
        revision: "9e137df46d535958f458e79934e2e6bc_8795",
        url: "assets/icon/denoise.jpg",
      },
      {
        revision: "2c0e78abf5d31843392ddb28c6cd3396_8795",
        url: "assets/icon/dialog/arrow-folder-closed.svg",
      },
      {
        revision: "cbe6f28beddab0de1be6bf56046c7903_8795",
        url: "assets/icon/dialog/arrow-folder-open.svg",
      },
      {
        revision: "1fb000abba600496f5e36cb727821127_8795",
        url: "assets/icon/dialog/card-view.svg",
      },
      {
        revision: "47c2e6182d9bc1f21d2d1e9003880fa4_8795",
        url: "assets/icon/dialog/clock.svg",
      },
      {
        revision: "7114feedcb6fc0c45c00d082b85da1f1_8795",
        url: "assets/icon/dialog/cloud-logo.svg",
      },
      {
        revision: "2f365ef68d13d6497f46b78e1b3e2ad5_8795",
        url: "assets/icon/dialog/cloud-vendors/cloud-native-icon.svg",
      },
      {
        revision: "ab4b1051a2224aa93fe65513edcbc976_8795",
        url: "assets/icon/dialog/cloud-vendors/cloud-native.svg",
      },
      {
        revision: "b595125f4e97bf0d17b7378131a7c075_8795",
        url: "assets/icon/dialog/cloud-vendors/googledrive.svg",
      },
      {
        revision: "96b1dd46e44abbe67766e8eb9d5875b5_8795",
        url: "assets/icon/dialog/cloud-vendors/OneDrive-color.svg",
      },
      {
        revision: "f62aa87877940d1faa965a6bda5b1326_8795",
        url: "assets/icon/dialog/cloud-vendors/OneDrive-mono.svg",
      },
      {
        revision: "e47a968393fcac7e271636adf20c87a5_8795",
        url: "assets/icon/dialog/cloud-vendors/sharepoint.svg",
      },
      {
        revision: "7e180cd8a7641eeb4245acfa93bafaf4_8795",
        url: "assets/icon/dialog/comm_62.ico.svg",
      },
      {
        revision: "64f347257e17ac9d0aaed4e0370a05aa_8795",
        url: "assets/icon/dialog/cp_4a_delete.ico.svg",
      },
      {
        revision: "f53832a3a7c2ed47138406f224fa455a_8795",
        url: "assets/icon/dialog/cut.svg",
      },
      {
        revision: "d60678196662b1adc3afa0381d1305c4_8795",
        url: "assets/icon/dialog/download-file.svg",
      },
      {
        revision: "f63f53cc43d5aa9241980e476f43023a_8795",
        url: "assets/icon/dialog/download.svg",
      },
      {
        revision: "5f844ec7b533351b57abcf54a5ecec93_8795",
        url: "assets/icon/dialog/email.svg",
      },
      {
        revision: "495f00d68499d4c32f37f05e3d1fdf0a_8795",
        url: "assets/icon/dialog/error.svg",
      },
      {
        revision: "59f713200e32f92822bdfc82de636083_8795",
        url: "assets/icon/dialog/export/warning.svg",
      },
      {
        revision: "d8dbfe72483d307c010174679fd6a8d8_8795",
        url: "assets/icon/dialog/filter.svg",
      },
      {
        revision: "0ba1a7279878d88d20b3dc6b8e3c090b_8795",
        url: "assets/icon/dialog/folder.svg",
      },
      {
        revision: "c3bd3ecebcb29ff97a7f8c22550bf331_8795",
        url: "assets/icon/dialog/gravit-cloud-icon.svg",
      },
      {
        revision: "ac1fdccbc30806ea9583635fb312a6e1_8795",
        url: "assets/icon/dialog/info-stroke.svg",
      },
      {
        revision: "2c2acf1f3a56ecbc155284c7a6aa5c47_8795",
        url: "assets/icon/dialog/info.svg",
      },
      {
        revision: "d256de0de6f5dd4d14c36b0f627b1b1a_8795",
        url: "assets/icon/dialog/list-view.svg",
      },
      {
        revision: "66e602f45de6d19ea3d0c27f08bb393d_8795",
        url: "assets/icon/dialog/magnifier.svg",
      },
      {
        revision: "ba89ec8a5c4da7e972e3751bf44f17d9_8795",
        url: "assets/icon/dialog/maximize.svg",
      },
      {
        revision: "36b44f2953ae83ac0849e1c13b1e020c_8795",
        url: "assets/icon/dialog/menu-arrow-closed.svg",
      },
      {
        revision: "588cad09aa78e37040ebb02100ac7fa4_8795",
        url: "assets/icon/dialog/menu-arrow-open-right.svg",
      },
      {
        revision: "8ee7762ba7df97206adc3b2b6d135bb4_8795",
        url: "assets/icon/dialog/menu-arrow-open.svg",
      },
      {
        revision: "5f25573d52e74df550aa34dd7d471d33_8795",
        url: "assets/icon/dialog/minimize.svg",
      },
      {
        revision: "83b17425507a52c7edc1a4b633927bfb_8795",
        url: "assets/icon/dialog/new-folder.svg",
      },
      {
        revision: "49599e49b40821557b0701bc91dfcf9b_8795",
        url: "assets/icon/dialog/ok.svg",
      },
      {
        revision: "b5d5d4bcfb3b44eceb6dea56e58ee9e4_8795",
        url: "assets/icon/dialog/plus-add.svg",
      },
      {
        revision: "91399047dca1c24e4328846e1f3c20ac_8795",
        url: "assets/icon/dialog/shared_folder.svg",
      },
      {
        revision: "af08d94458ae3511886004abb0184c96_8795",
        url: "assets/icon/dialog/tale-bottom.svg",
      },
      {
        revision: "28e44d4a0dbaedbcbb288e21251e4993_8795",
        url: "assets/icon/dialog/tale-top.svg",
      },
      {
        revision: "550d48be773eef373a808f697b436d5e_8795",
        url: "assets/icon/dialog/tale-triangle-bottom.svg",
      },
      {
        revision: "874d8ce65dca66accb353ee7d4b6f00f_8795",
        url: "assets/icon/dialog/tale-triangle-left.svg",
      },
      {
        revision: "caf3c633635d0b96127ee6ad95272e0b_8795",
        url: "assets/icon/dialog/tale-triangle-right.svg",
      },
      {
        revision: "27317e9744c9c636a1c85797fd310418_8795",
        url: "assets/icon/dialog/tale-triangle-top.svg",
      },
      {
        revision: "3e3b1071c1dad2196ee134883abb5e3d_8795",
        url: "assets/icon/dotscreen.jpg",
      },
      {
        revision: "4e099a556e5282873451d3c0c51e1ead_8795",
        url: "assets/icon/drag-indicator.svg",
      },
      {
        revision: "1571ebd38fdfb620ae3be4373fb8b5fa_8795",
        url: "assets/icon/drop_shadow.jpg",
      },
      {
        revision: "1689fd06412b569acf3f3118430dc046_8795",
        url: "assets/icon/edge_work.jpg",
      },
      {
        revision: "98e87e7493ad45bb7fbded146a785ed0_8795",
        url: "assets/icon/edit.svg",
      },
      {
        revision: "ee1280ff003ed5df49647d2ff3bd0b34_8795",
        url: "assets/icon/error.svg",
      },
      {
        revision: "991cce36e0604032d64165d527d42e27_8795",
        url: "assets/icon/export-swatches.svg",
      },
      {
        revision: "217f3cc4f5ade3e4187718eb016d41fc_8795",
        url: "assets/icon/facebook.svg",
      },
      {
        revision: "cb2e0003a281a0e1dc6a0a5ce7d34361_8795",
        url: "assets/icon/facebook2.svg",
      },
      {
        revision: "2fcbbca501ed4182631cee49c8c45837_8795",
        url: "assets/icon/fisheye.jpg",
      },
      {
        revision: "b5d6bf2da54444a4efd8b87a413d5449_8795",
        url: "assets/icon/folder.svg",
      },
      {
        revision: "0880ed7bc565a86d39b7ddb051fe1b2d_8795",
        url: "assets/icon/google.svg",
      },
      {
        revision: "53adb9d7ca0ea0ecbad91ca164988c80_8795",
        url: "assets/icon/google2.svg",
      },
      {
        revision: "599dd1923743ebc751373844460eec02_8795",
        url: "assets/icon/gravit-icon-add-files.svg",
      },
      {
        revision: "1e6bf187cb5e27d9974c8132ece67bc4_8795",
        url: "assets/icon/gravit-icon-annotationtools-arrow-tool.svg",
      },
      {
        revision: "43f9b89f389ec824d4177693ff9097f8_8795",
        url: "assets/icon/gravit-icon-annotationtools-comment.svg",
      },
      {
        revision: "c8e993f5c6de6c9de27da84ab20539c2_8795",
        url: "assets/icon/gravit-icon-annotationtools-highlighter.svg",
      },
      {
        revision: "15f6a3a5f9890f2b8e8b46692d543562_8795",
        url: "assets/icon/gravit-icon-annotationtools-note-tool.svg",
      },
      {
        revision: "78b1889dd6fbedda88ffa97ddf58ebf4_8795",
        url: "assets/icon/gravit-icon-autosave.svg",
      },
      {
        revision: "1913ceec805327069df184c5939b9b1a_8795",
        url: "assets/icon/gravit-icon-cloud.svg",
      },
      {
        revision: "eb090df4ef5b64c9689abe37514e7745_8795",
        url: "assets/icon/gravit-icon-comments-off-light.svg",
      },
      {
        revision: "a2a4fdc2e211bd9a7aa1da626ffad301_8795",
        url: "assets/icon/gravit-icon-comments-off.svg",
      },
      {
        revision: "06101ee0e68975b15a9882a9dac524e2_8795",
        url: "assets/icon/gravit-icon-comments-on-light.svg",
      },
      {
        revision: "2ac0b07ac3c6f00e3abf1f6ea1c94b33_8795",
        url: "assets/icon/gravit-icon-comments-on.svg",
      },
      {
        revision: "3719914e20a27c669da91a8b6efb25d1_8795",
        url: "assets/icon/gravit-icon-dot.svg",
      },
      {
        revision: "873d779ad0f8fbc1c152fa982d35383d_8795",
        url: "assets/icon/gravit-icon-duplicate.svg",
      },
      {
        revision: "52edc75bcdf8d7096461e3efb254b1ba_8795",
        url: "assets/icon/gravit-icon-edit.svg",
      },
      {
        revision: "24968388f3e85d3cc848c023fef7f0f1_8795",
        url: "assets/icon/gravit-icon-exclamation.svg",
      },
      {
        revision: "291c94cfc43c525e5f5a9d4a9d683dd0_8795",
        url: "assets/icon/gravit-icon-google-translate.svg",
      },
      {
        revision: "1f2560fded5083ab38eedfbe5af7de59_8795",
        url: "assets/icon/gravit-icon-install.svg",
      },
      {
        revision: "2b4a283617d8a7f34b31e7657b60d3ef_8795",
        url: "assets/icon/gravit-icon-local-file.svg",
      },
      {
        revision: "22105fd0ddc7c90cdf693f961288426f_8795",
        url: "assets/icon/gravit-icon-open.svg",
      },
      {
        revision: "41b8a104503b348a8f80377b832a63d4_8795",
        url: "assets/icon/gravit-icon-paste-in-place.svg",
      },
      {
        revision: "e60cb271ed0e2624eaa77507cd1db15d_8795",
        url: "assets/icon/gravit-icon-question.svg",
      },
      {
        revision: "720ae81befb8ef698869fb47b4651584_8795",
        url: "assets/icon/gravit-icon-reopen.svg",
      },
      {
        revision: "c3ef696cac0a0d62248d63c7e5cfea85_8795",
        url: "assets/icon/gravit-icon-resolve-all.svg",
      },
      {
        revision: "0304cf7fe51c838e94cc2c3e87100ffb_8795",
        url: "assets/icon/gravit-icon-resolve.svg",
      },
      {
        revision: "e723926dff7dcea11b1221dc6c736523_8795",
        url: "assets/icon/gravit-icon-rotate-right-flat.svg",
      },
      {
        revision: "c71684b602971e6bbd223f83fdc19476_8795",
        url: "assets/icon/gravit-icon-send-to-back.svg",
      },
      {
        revision: "3cf405efe6b9494726a168086dda4984_8795",
        url: "assets/icon/gravit-icon-send-to-front.svg",
      },
      {
        revision: "52d3bcf1f63f8928c5f6c2699f5cdf68_8795",
        url: "assets/icon/gravit-icon-text-decoration-bold.svg",
      },
      {
        revision: "0fca70dbdc2730cb909fcd6e6fceaa87_8795",
        url: "assets/icon/gravit-icon-text-decoration-italic.svg",
      },
      {
        revision: "f428d4ef332432f169496861421bc744_8795",
        url: "assets/icon/gravit-icon-text-decoration-strikeout.svg",
      },
      {
        revision: "6c06e6e64ab204a206155634bd9e4537_8795",
        url: "assets/icon/gravit-icon-text-decoration-underline.svg",
      },
      {
        revision: "a73a88d27ecc818c771bb3bb2d23817a_8795",
        url: "assets/icon/gravit-icon-text-transform-capitalize.svg",
      },
      {
        revision: "423790ca9e7ad9ba48c58135ccab627a_8795",
        url: "assets/icon/gravit-icon-text-transform-lowercase.svg",
      },
      {
        revision: "3063b9ab8d3fb5cd8b79105396f02bc6_8795",
        url: "assets/icon/gravit-icon-text-transform-smallcaps.svg",
      },
      {
        revision: "7b5b6efa0f6fef812738fb2dbf9cc3c0_8795",
        url: "assets/icon/gravit-icon-text-transform-uppercase.svg",
      },
      {
        revision: "15e7718f965df281a0298b0dcbb776e5_8795",
        url: "assets/icon/gravit-icon-text-typography-fractions.svg",
      },
      {
        revision: "83fa4cdc5c95d34a25b339af7a54795e_8795",
        url: "assets/icon/gravit-icon-text-typography-ligatures.svg",
      },
      {
        revision: "706e752c784e992a90e5142e28693f9f_8795",
        url: "assets/icon/gravit-icon-text-typography-subscript.svg",
      },
      {
        revision: "974da38221fedf7cdbc0bde5bb49f9bb_8795",
        url: "assets/icon/gravit-icon-text-typography-superscript.svg",
      },
      {
        revision: "e54a858eb0a1486ad1bf3613e5e63c7a_8795",
        url: "assets/icon/half_tone.jpg",
      },
      {
        revision: "66f1139f26d4c1db85f5d4d0bac289a1_8795",
        url: "assets/icon/hexagonal.jpg",
      },
      {
        revision: "5d01736bce213249da7dbdfaa58f547b_8795",
        url: "assets/icon/import-swatches.svg",
      },
      {
        revision: "d5661af0b8da85705aa9f504ca12147d_8795",
        url: "assets/icon/info.svg",
      },
      {
        revision: "6fea881ce9e61020e430c5cecfc484e9_8795",
        url: "assets/icon/ink.jpg",
      },
      {
        revision: "bbc4bed8885bcc47a725285e39cd9218_8795",
        url: "assets/icon/inner_glow.jpg",
      },
      {
        revision: "656ae83b384277aad502d9e6d841200d_8795",
        url: "assets/icon/inner_shadow.jpg",
      },
      {
        revision: "a24e62ecf164564125391701862db3a0_8795",
        url: "assets/icon/kebab.svg",
      },
      {
        revision: "996bc324d3a3552b88be23dafb2bebc0_8795",
        url: "assets/icon/lens_blur.jpg",
      },
      {
        revision: "05006d52ad3e72aed47fa7b7d464068d_8795",
        url: "assets/icon/link.svg",
      },
      {
        revision: "c0e808cd42a2b60e0813cdf931bdce7d_8795",
        url: "assets/icon/login/close.svg",
      },
      {
        revision: "988675512c794daf15d643aa4c16315d_8795",
        url: "assets/icon/long_shadow.jpg",
      },
      {
        revision: "c36c93d4bdbc30028e1bdee0d4f84c62_8795",
        url: "assets/icon/mirror.jpg",
      },
      {
        revision: "2498d2c065064a14aa4bc884a8e7ba0f_8795",
        url: "assets/icon/more-symbol-dark.svg",
      },
      {
        revision: "462b99ac59d0e96723bcf049364a38c3_8795",
        url: "assets/icon/more-symbol.svg",
      },
      {
        revision: "016c672500b46635a3e726ced3eb6c16_8795",
        url: "assets/icon/news.svg",
      },
      {
        revision: "2244fd22b77c5cb4837b306c9c1e543a_8795",
        url: "assets/icon/noise.jpg",
      },
      {
        revision: "2554ccb4d47c2924550e85962fd4e830_8795",
        url: "assets/icon/notification-icon-dark.svg",
      },
      {
        revision: "5fdc6b08cbf06ec955d73b47ba318e37_8795",
        url: "assets/icon/notification-icon-light.svg",
      },
      {
        revision: "5fdc6b08cbf06ec955d73b47ba318e37_8795",
        url: "assets/icon/notification-icon.svg",
      },
      {
        revision: "8b405516e2fc4b1ac7e8e2f85adbe7c1_8795",
        url: "assets/icon/numbers-1-dark.svg",
      },
      {
        revision: "bf88c76a608e8ad608ad947d6c417deb_8795",
        url: "assets/icon/numbers-1.svg",
      },
      {
        revision: "320b02d4d9ea496750712db675c345d7_8795",
        url: "assets/icon/numbers-2-dark.svg",
      },
      {
        revision: "575cfc0d9ee445fb6eb1d8aebf80a616_8795",
        url: "assets/icon/numbers-2.svg",
      },
      {
        revision: "b8cad0cf9ca32d07d93f290b39bf3160_8795",
        url: "assets/icon/numbers-3-dark.svg",
      },
      {
        revision: "76235c2b896def0d168e32269f88ba9d_8795",
        url: "assets/icon/numbers-3.svg",
      },
      {
        revision: "b6abb47deb4b0dc74e56f65152837ab3_8795",
        url: "assets/icon/offline.svg",
      },
      {
        revision: "1ef27a550a152a4edfe36e9e7676613e_8795",
        url: "assets/icon/open_recent.svg",
      },
      {
        revision: "936f1d3d95d4cc76316730d9b1488e66_8795",
        url: "assets/icon/open.svg",
      },
      {
        revision: "422d38fde4c5f264e2fdfe5b197f34c3_8795",
        url: "assets/icon/outer_glow.jpg",
      },
      {
        revision: "010203cfb1785cca3885829111fbe8a1_8795",
        url: "assets/icon/overlay.jpg",
      },
      {
        revision: "e4baaf2c55f817ec140099b7d46b7780_8795",
        url: "assets/icon/paste.svg",
      },
      {
        revision: "05b68753230ef8f3189c4b51be8fc5e0_8795",
        url: "assets/icon/pipette.svg",
      },
      {
        revision: "bff9918973cce5bcf1e3c802af74d5f7_8795",
        url: "assets/icon/place-image.svg",
      },
      {
        revision: "41e6eba82da032ed31ca8c99e2e8ccd8_8795",
        url: "assets/icon/pointer.svg",
      },
      {
        revision: "5f521cead27099c1bc29accbc1fb859f_8795",
        url: "assets/icon/private-share-dark.svg",
      },
      {
        revision: "6222acd36f5cda5df8b8d76b9e5d0bda_8795",
        url: "assets/icon/private-share.svg",
      },
      {
        revision: "9219a653f79f40f76db18be7a4e0eb28_8795",
        url: "assets/icon/public-share-link.svg",
      },
      {
        revision: "cb78fada1cd7ebf301e3a1dbb634c8de_8795",
        url: "assets/icon/public-share.svg",
      },
      {
        revision: "592ba5ab953097393d77c1d58d4487ed_8795",
        url: "assets/icon/purchase.svg",
      },
      {
        revision: "e8c51a70a87a9dd455b52e34ca29c916_8795",
        url: "assets/icon/recolor.jpg",
      },
      {
        revision: "cc25193c87172efcfa2685d28dd76d1e_8795",
        url: "assets/icon/resend-invitation-email.svg",
      },
      {
        revision: "7ee35ba232a0826fa5f6b0217f9b3d77_8795",
        url: "assets/icon/resolve.svg",
      },
      {
        revision: "70148587c64354bb8b91c79ca413d547_8795",
        url: "assets/icon/result.svg",
      },
      {
        revision: "eb5531de617f5f7f86ce057f922a3ebd_8795",
        url: "assets/icon/reverse.svg",
      },
      {
        revision: "257c2d2f35c36aaedf2ba5d2b7b2047c_8795",
        url: "assets/icon/role-checked.svg",
      },
      {
        revision: "fd1e507aa159c5cff44611997d8faedc_8795",
        url: "assets/icon/rotate-left.svg",
      },
      {
        revision: "0e99681188f3c5e9412c836169d59477_8795",
        url: "assets/icon/rotate-right.svg",
      },
      {
        revision: "c3bcb02c792913a192307ce0ea4c7e8b_8795",
        url: "assets/icon/sepia.jpg",
      },
      {
        revision: "16215179e9faf0ff7262374425d4dc36_8795",
        url: "assets/icon/shared-link.svg",
      },
      {
        revision: "ff7f780333e2fe71c90a028bd9419555_8795",
        url: "assets/icon/shared-with-me.svg",
      },
      {
        revision: "969228412223cf2a67884bac3f6c6d3f_8795",
        url: "assets/icon/shared.svg",
      },
      {
        revision: "05c605496193f7fd0c443cb433b144cb_8795",
        url: "assets/icon/sketch.jpg",
      },
      {
        revision: "f8f3a4a40ff448478db79a173ffe11b2_8795",
        url: "assets/icon/sort-asc.svg",
      },
      {
        revision: "0c00ad8a772a254b860a4a1eb36bac27_8795",
        url: "assets/icon/sort-desc.svg",
      },
      {
        revision: "f73df3921247f46dba75312a183dd2e0_8795",
        url: "assets/icon/start.svg",
      },
      {
        revision: "1edd3c91148f3ea36be689dd9a783ed8_8795",
        url: "assets/icon/stroke.jpg",
      },
      {
        revision: "0f056fdcebdeea713e16e45eb5cb17b9_8795",
        url: "assets/icon/swirl.jpg",
      },
      {
        revision: "013ae9dab7e1f34c65a920f81f550fbc_8795",
        url: "assets/icon/templates.svg",
      },
      {
        revision: "86082485dba99ef6869a6bc5f47bd675_8795",
        url: "assets/icon/thanks.svg",
      },
      {
        revision: "67b89e47f35bb1cde1aafd5ae5848f9a_8795",
        url: "assets/icon/tilt_shift.jpg",
      },
      {
        revision: "686408172d7bdeb0392a8f44593f97e8_8795",
        url: "assets/icon/toon.jpg",
      },
      {
        revision: "ad6cac891757f763d88cff84eaf8876c_8795",
        url: "assets/icon/touch/add-swatches.svg",
      },
      {
        revision: "304e7bc1012e8b3e8f7d7f4a62da0ac9_8795",
        url: "assets/icon/touch/add.svg",
      },
      {
        revision: "a264cb5144bb3865506d96627ca64bbf_8795",
        url: "assets/icon/touch/align-bottom-text.svg",
      },
      {
        revision: "7760d6c74b8da5ad55a9c85237857607_8795",
        url: "assets/icon/touch/align-bottom.svg",
      },
      {
        revision: "479f67724c448aafc80d3568cfaa385d_8795",
        url: "assets/icon/touch/align-center-text.svg",
      },
      {
        revision: "5bba9cdf12a4451a1bc4d37a1056ac71_8795",
        url: "assets/icon/touch/align-center.svg",
      },
      {
        revision: "5acd22f4f1097e9c208b74365bbedec1_8795",
        url: "assets/icon/touch/align-left-text.svg",
      },
      {
        revision: "9d182d8865ff51bf9309535b781eaa88_8795",
        url: "assets/icon/touch/align-left.svg",
      },
      {
        revision: "9ad4f66cb4d0fec9f6469fa28b0a2ba8_8795",
        url: "assets/icon/touch/align-middle-text.svg",
      },
      {
        revision: "5b8c07edc845857cb3dec71de2fa8352_8795",
        url: "assets/icon/touch/align-middle.svg",
      },
      {
        revision: "ff1316d50f5308e1b5b9fbb563452dae_8795",
        url: "assets/icon/touch/align-panel.svg",
      },
      {
        revision: "de8b12bb60c36eceba8ee8cca07b24c8_8795",
        url: "assets/icon/touch/align-right-text.svg",
      },
      {
        revision: "424d891da7c12366e367f89f49eb8195_8795",
        url: "assets/icon/touch/align-right.svg",
      },
      {
        revision: "b840dfd35ecfe1e147876687d94a40da_8795",
        url: "assets/icon/touch/align-top-text.svg",
      },
      {
        revision: "3a6126fa33dd0e2f2d571dcfe175a1ae_8795",
        url: "assets/icon/touch/align-top.svg",
      },
      {
        revision: "83bae236e48eece6621968b7e16eeefd_8795",
        url: "assets/icon/touch/anchor-bottom.svg",
      },
      {
        revision: "7f9348a7a5ec46e59175579b9e23b55d_8795",
        url: "assets/icon/touch/anchor-center.svg",
      },
      {
        revision: "360818a169130a7d46afe8cab06bf8f2_8795",
        url: "assets/icon/touch/anchor-letf.svg",
      },
      {
        revision: "d1e11af97212dacca781d4e12400f26b_8795",
        url: "assets/icon/touch/anchor-middle.svg",
      },
      {
        revision: "ce50979e55786b635e754055ff4d3ff4_8795",
        url: "assets/icon/touch/anchor-right.svg",
      },
      {
        revision: "b3e30165d6693f9a6775cd1ced40efc6_8795",
        url: "assets/icon/touch/anchor-top.svg",
      },
      {
        revision: "75e924a51918d3bf0d72a196a5ac3810_8795",
        url: "assets/icon/touch/appearance-panel.svg",
      },
      {
        revision: "d126e29e81ace6a1889a9e3050bc579b_8795",
        url: "assets/icon/touch/apply-to-border.svg",
      },
      {
        revision: "b78a958ab60663d9cb914b3f22c3bc3c_8795",
        url: "assets/icon/touch/apply-to-fill.svg",
      },
      {
        revision: "abe98aff49cee5330a641c27d432fb73_8795",
        url: "assets/icon/touch/apply-to-whole.svg",
      },
      {
        revision: "848a6047e7b5ecdcc199828fe32f26c8_8795",
        url: "assets/icon/touch/arrange.svg",
      },
      {
        revision: "7960fad56abd74158be6dee4b0467dd8_8795",
        url: "assets/icon/touch/arrow-down-small.svg",
      },
      {
        revision: "8e21d905d96dd0cc56ab5e80e8ea2e7d_8795",
        url: "assets/icon/touch/arrow-down.svg",
      },
      {
        revision: "83e72b2ee3f124601dffc9812cf263c5_8795",
        url: "assets/icon/touch/arrow-left-small.svg",
      },
      {
        revision: "32c62a26f28b1efb8131ef88f486a0eb_8795",
        url: "assets/icon/touch/arrow-left.svg",
      },
      {
        revision: "60b774d0ea0c964de1003783736f35f4_8795",
        url: "assets/icon/touch/arrow-right.svg",
      },
      {
        revision: "266b76169e84554e6f3dba6b605b06be_8795",
        url: "assets/icon/touch/arrow-up.svg",
      },
      {
        revision: "58c0489ce965817887d3a3d4e2193dd1_8795",
        url: "assets/icon/touch/artboard-small.svg",
      },
      {
        revision: "d94eb8264b1386e7c0bbc9e48d3c9092_8795",
        url: "assets/icon/touch/artboard.svg",
      },
      {
        revision: "011599df03ff988618fcde478d0a63ea_8795",
        url: "assets/icon/touch/attach-to-path.svg",
      },
      {
        revision: "67259fc22abe9bbeb5c7c0493be24968_8795",
        url: "assets/icon/touch/bezigon.svg",
      },
      {
        revision: "b180537ccca187c2a5f52ce49994c30c_8795",
        url: "assets/icon/touch/bold-text.svg",
      },
      {
        revision: "fafc23b98a16b5761d272202665debc4_8795",
        url: "assets/icon/touch/break-curve.svg",
      },
      {
        revision: "99882b54649bb32ed849bb48f75442e5_8795",
        url: "assets/icon/touch/bring-forward.svg",
      },
      {
        revision: "d3b1318cd6f192949a95b7b12eb03584_8795",
        url: "assets/icon/touch/bring-to-front.svg",
      },
      {
        revision: "1a4e6c9f83cdd0ba36c0e83fb1707d21_8795",
        url: "assets/icon/touch/capitalize-text.svg",
      },
      {
        revision: "1cfa2b4937d459d5e422f152a89a50f7_8795",
        url: "assets/icon/touch/chavron-down-small.svg",
      },
      {
        revision: "73c39f780d6acec8db375fe8d165f7fb_8795",
        url: "assets/icon/touch/chavron-up-small.svg",
      },
      {
        revision: "62654605e1ab7f86a049abbfac8e2dc9_8795",
        url: "assets/icon/touch/check-small.svg",
      },
      {
        revision: "42576469a0a838c2298944572c286b5c_8795",
        url: "assets/icon/touch/check.svg",
      },
      {
        revision: "a7cba742d60e5f941bce28c26ce7fe62_8795",
        url: "assets/icon/touch/checked-dark.svg",
      },
      {
        revision: "e7ee46b350e582f088a0b986d417f96c_8795",
        url: "assets/icon/touch/checked-light.svg",
      },
      {
        revision: "cd9b4c038d63180248e155e906937738_8795",
        url: "assets/icon/touch/chevron-down.svg",
      },
      {
        revision: "fa2cbef162a9860c0708c326954372ec_8795",
        url: "assets/icon/touch/chevron-left-small.svg",
      },
      {
        revision: "4acca2455aba534118fae4f0767d7607_8795",
        url: "assets/icon/touch/chevron-left.svg",
      },
      {
        revision: "f5660d5e75d583d1e52803ff29f3e5ec_8795",
        url: "assets/icon/touch/chevron-right-small.svg",
      },
      {
        revision: "2df4f8b861b00579d2ed0065ec0df3f3_8795",
        url: "assets/icon/touch/chevron-right.svg",
      },
      {
        revision: "3b7e64ef48a5886b22b328770a757a24_8795",
        url: "assets/icon/touch/chevron-up.svg",
      },
      {
        revision: "fb65234ac1abc93f03910551fdf1a237_8795",
        url: "assets/icon/touch/clip-content-page.svg",
      },
      {
        revision: "97d802f2680006d2cbfc57572954f7bf_8795",
        url: "assets/icon/touch/clip.svg",
      },
      {
        revision: "ec0454e3ec5fe65568b94c912f9f8075_8795",
        url: "assets/icon/touch/close.svg",
      },
      {
        revision: "91785e864bb3691d71417d5abef42ed6_8795",
        url: "assets/icon/touch/cloud-corel.svg",
      },
      {
        revision: "eff0ed505880b2aa5412c85328aac630_8795",
        url: "assets/icon/touch/cloud-google-drive.svg",
      },
      {
        revision: "89bbb7181ebb27c45927e43db204f8ef_8795",
        url: "assets/icon/touch/cloud-gravit.svg",
      },
      {
        revision: "6178d88b59459d6bdf3fab74e0ed9a0d_8795",
        url: "assets/icon/touch/cloud-sharepoint.svg",
      },
      {
        revision: "7e11404cc1fbadfcfaa6a0449df2c778_8795",
        url: "assets/icon/touch/comments-panel.svg",
      },
      {
        revision: "fc5730683fd15278b4f9f5f03e93cbf1_8795",
        url: "assets/icon/touch/compound-difference-small.svg",
      },
      {
        revision: "0da452710ed23551db9fab293780ea44_8795",
        url: "assets/icon/touch/compound-intersect-small.svg",
      },
      {
        revision: "1af5f37bce13292a861d0fdf01d8d37a_8795",
        url: "assets/icon/touch/compound-shape-small.svg",
      },
      {
        revision: "d1001493874e922b23b2ba93570bc4cc_8795",
        url: "assets/icon/touch/compound-subtract-small.svg",
      },
      {
        revision: "b755ecd311e7380c75a2a6bf1d487bab_8795",
        url: "assets/icon/touch/convert-to-outline.svg",
      },
      {
        revision: "a2683c24adf70c963f2c48e038e74570_8795",
        url: "assets/icon/touch/convert-to-path.svg",
      },
      {
        revision: "c2fc3a2ec43a658f48bd708eb14bfb68_8795",
        url: "assets/icon/touch/convert-to-raw-path.svg",
      },
      {
        revision: "9805e5ea36de6f823c0e5d475ef4405f_8795",
        url: "assets/icon/touch/copy-small.svg",
      },
      {
        revision: "ab3b241d82c019d05ba9d940049e910a_8795",
        url: "assets/icon/touch/copy.svg",
      },
      {
        revision: "8e35cd4f011e2e3ae1e8420d1e9771f7_8795",
        url: "assets/icon/touch/corners-bevel.svg",
      },
      {
        revision: "c50de9243b379b35b267138eacc0212a_8795",
        url: "assets/icon/touch/corners-fancy.svg",
      },
      {
        revision: "986985f3f8da35c5e93d8f62ed0686f6_8795",
        url: "assets/icon/touch/corners-inset.svg",
      },
      {
        revision: "1f79e9d6594cf390b62ab2f0cf3d7610_8795",
        url: "assets/icon/touch/corners-round.svg",
      },
      {
        revision: "7a288370aed2b24a6cc099c4d8198b49_8795",
        url: "assets/icon/touch/corners-round2.svg",
      },
      {
        revision: "ef168ee65e93fc08bd2a4006fae16b55_8795",
        url: "assets/icon/touch/create-symbol.svg",
      },
      {
        revision: "6c0f503c5bd2e235f5ad1b2bea45f42d_8795",
        url: "assets/icon/touch/crop.svg",
      },
      {
        revision: "635a29e078259b6ab2850735d4fe277f_8795",
        url: "assets/icon/touch/ctrl-point-circle.svg",
      },
      {
        revision: "674d0385e49366d4f22315097c649ed2_8795",
        url: "assets/icon/touch/ctrl-point-rhombus.svg",
      },
      {
        revision: "a23efdac0155993bade77a9fbd5c86b4_8795",
        url: "assets/icon/touch/cut.svg",
      },
      {
        revision: "d3da8a9b26b06efb558e35b81c939986_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-arrange-bring-forward.svg",
      },
      {
        revision: "bfb66c593c14de0129b7bf83b8d10361_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-arrange-order.svg",
      },
      {
        revision: "f06a2da14d201575842572a3bf66f723_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-arrange-send-back.svg",
      },
      {
        revision: "b96085a2dc8a17cc7fcc5cc9a15b7a2a_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-arrange-send-backward.svg",
      },
      {
        revision: "3bdef7e3367c69a53701a5a6aeee1214_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-arrange-send-front.svg",
      },
      {
        revision: "aca4045b53e79b7233b3a5da03a5d59b_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-arrow-key-down.svg",
      },
      {
        revision: "fe54ad08e6c10d09f96589dd0c177c56_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-arrow-key-left.svg",
      },
      {
        revision: "84ee660c710f1353c2abc75b45c0233d_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-arrow-key-right.svg",
      },
      {
        revision: "6ccb0ce6dde7df06432188c82f424bea_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-arrow-key-up.svg",
      },
      {
        revision: "5a4ddfb49cd060ad0b3c1ff8aa364db6_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-convert-to-path.svg",
      },
      {
        revision: "73c6bfa805df96dda9c2da12333bc7e0_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-copy.svg",
      },
      {
        revision: "8dd72f550fe53b5346bf197fbd71a0b8_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-fullscreen.svg",
      },
      {
        revision: "d9f489ab42c0cafc72fc1e78f1089a21_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-group.svg",
      },
      {
        revision: "a32a4bcd0ce91685700eecbf7aee001c_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-help.svg",
      },
      {
        revision: "a7a07964aba4bf508c179fc938f53db2_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-paste-and-replace.svg",
      },
      {
        revision: "03dd915c9f77a3279c8d31f51ed28c0b_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-paste-in-place.svg",
      },
      {
        revision: "e29349738919b189428d41d249544961_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-paste-inside.svg",
      },
      {
        revision: "b6dd9ff5d0bd17e7df0b9614601f2cfb_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-paste-style.svg",
      },
      {
        revision: "a6ca0a201927fd661165976e09a32497_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-paste.svg",
      },
      {
        revision: "3f1c71a6bb332f88a011ae736df1ff88_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-selection.svg",
      },
      {
        revision: "09fccc1d278d860a0ef9b1ec9a352398_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-trash-2.svg",
      },
      {
        revision: "386d0c04fd5733fbfc205d714348eafd_8795",
        url: "assets/icon/touch/dark/gravit-icon-touch-ungroup.svg",
      },
      {
        revision: "09f006a3b714a2500656d7949f82a028_8795",
        url: "assets/icon/touch/delete - small.svg",
      },
      {
        revision: "3924a6a8dc0dc7d78c759ba90f6da878_8795",
        url: "assets/icon/touch/delete.svg",
      },
      {
        revision: "d5b815f6679b7fadd0d034cc4534decb_8795",
        url: "assets/icon/touch/detach-from-path.svg",
      },
      {
        revision: "297c959bc05dea80efda4066f9a470ef_8795",
        url: "assets/icon/touch/detach-symbol.svg",
      },
      {
        revision: "99cd233c141bcfa9dabd0141fa2248de_8795",
        url: "assets/icon/touch/difference.svg",
      },
      {
        revision: "86a78efb1edc926e243608132724b467_8795",
        url: "assets/icon/touch/distribute-hor.svg",
      },
      {
        revision: "3811856d45497efd602661d97a990de5_8795",
        url: "assets/icon/touch/distribute-ver.svg",
      },
      {
        revision: "73f4bf37fa5e35f61e87f5d1acea14b1_8795",
        url: "assets/icon/touch/duplicate.svg",
      },
      {
        revision: "80ed7232a0ba80549eda36cbc1f808fe_8795",
        url: "assets/icon/touch/effects-panel.svg",
      },
      {
        revision: "f9ed4736036db0a6d2529a435a9642ff_8795",
        url: "assets/icon/touch/ellipse-closed.svg",
      },
      {
        revision: "ddff06911e59c8760ac135bc08d6f540_8795",
        url: "assets/icon/touch/ellipse-open.svg",
      },
      {
        revision: "867f3488cad29e5d03147de17a3bdd83_8795",
        url: "assets/icon/touch/ellipse-pie.svg",
      },
      {
        revision: "3d64671eb982e428ca49dd6a2501d3e9_8795",
        url: "assets/icon/touch/ellipse-small.svg",
      },
      {
        revision: "eeb18c9c7db4d11c7ca88bf4ef8358a5_8795",
        url: "assets/icon/touch/ellipse.svg",
      },
      {
        revision: "4a966fb6163eb3b4669c581759571585_8795",
        url: "assets/icon/touch/ends-butt.svg",
      },
      {
        revision: "32c53b2ef335d5a6d5cebe788f8172d8_8795",
        url: "assets/icon/touch/ends-round.svg",
      },
      {
        revision: "60b36ee521a2468909c8557f56502867_8795",
        url: "assets/icon/touch/ends-sqare.svg",
      },
      {
        revision: "ea029cfebb7bf83c0bae977cf57d492f_8795",
        url: "assets/icon/touch/expand-shrink.svg",
      },
      {
        revision: "121e7797fa96d3ed5ea1afb0c95d8aa7_8795",
        url: "assets/icon/touch/export-assets.svg",
      },
      {
        revision: "fb8115d00c22411528993210fb91a691_8795",
        url: "assets/icon/touch/export-canvas.svg",
      },
      {
        revision: "54f92ec7e6af2feace9080de6e884526_8795",
        url: "assets/icon/touch/export-selection.svg",
      },
      {
        revision: "991cce36e0604032d64165d527d42e27_8795",
        url: "assets/icon/touch/export-swatches.svg",
      },
      {
        revision: "d648006305318fe3d6189ea3982dfa58_8795",
        url: "assets/icon/touch/export.svg",
      },
      {
        revision: "ef4d8f9b8f23ef762ca9272062f0bcaf_8795",
        url: "assets/icon/touch/extract-colors.svg",
      },
      {
        revision: "6e9c052c76f4fa1e3baec0b963f91360_8795",
        url: "assets/icon/touch/fit-all.svg",
      },
      {
        revision: "22bd92445c88aecabb9d1e99a370511c_8795",
        url: "assets/icon/touch/flatten.svg",
      },
      {
        revision: "d2a378aa51043194f38d5e7d77609282_8795",
        url: "assets/icon/touch/flip-hor.svg",
      },
      {
        revision: "c81baec58837844f34afb3169d169edc_8795",
        url: "assets/icon/touch/flip-ver.svg",
      },
      {
        revision: "c7b6f89ddf50eb60b2bf7c4db867238c_8795",
        url: "assets/icon/touch/folder-close-small.svg",
      },
      {
        revision: "c4f5ea5533195d3b55771357e1a3f775_8795",
        url: "assets/icon/touch/folder-open-small.svg",
      },
      {
        revision: "39caea6f94b13dc48dd630e9f62ab906_8795",
        url: "assets/icon/touch/fractions-text.svg",
      },
      {
        revision: "8ae44327a07fbd4dc3df732fade22d02_8795",
        url: "assets/icon/touch/freehand-shaping.svg",
      },
      {
        revision: "0187e02bafbc6117974f900000432f70_8795",
        url: "assets/icon/touch/freehand.svg",
      },
      {
        revision: "0c8f53bb7068d9ebeabef7a263522549_8795",
        url: "assets/icon/touch/fullscreen.svg",
      },
      {
        revision: "e638f44e36a7b114a48f2ec18a6c08db_8795",
        url: "assets/icon/touch/go-to-master.svg",
      },
      {
        revision: "c2fa8eefca8c54a073af1fad1f3672d9_8795",
        url: "assets/icon/touch/gravit-annotation-icon-menu.svg",
      },
      {
        revision: "fe40b94540fd721ba333bf3df6dfdbdd_8795",
        url: "assets/icon/touch/gravit-icon-annotationtools-ellipse.svg",
      },
      {
        revision: "22265926e26fce5c09752b8777016a10_8795",
        url: "assets/icon/touch/gravit-icon-annotationtools-highlighter.svg",
      },
      {
        revision: "52b0b79c9650db1bc3ab502765389672_8795",
        url: "assets/icon/touch/gravit-icon-annotationtools-line.svg",
      },
      {
        revision: "24a3f788cdc777c4b7a2c42f51cda796_8795",
        url: "assets/icon/touch/gravit-icon-annotationtools-pencil.svg",
      },
      {
        revision: "53fd7a197c680f477d11ed6279e970f8_8795",
        url: "assets/icon/touch/gravit-icon-annotationtools-rectangle.svg",
      },
      {
        revision: "37643009ddb44e07c96867b501a7a968_8795",
        url: "assets/icon/touch/gravit-icon-settings.svg",
      },
      {
        revision: "766ab294fa0731e023dc7498b537a519_8795",
        url: "assets/icon/touch/gravit-icon-touch-align-bottom.svg",
      },
      {
        revision: "e643c14dbbdab46d33682e90cafbd620_8795",
        url: "assets/icon/touch/gravit-icon-touch-align-center.svg",
      },
      {
        revision: "fa2a1fce283d2da0986675a2812cea57_8795",
        url: "assets/icon/touch/gravit-icon-touch-align-left.svg",
      },
      {
        revision: "b3388f8eef51f2cc6a23c325fea21bea_8795",
        url: "assets/icon/touch/gravit-icon-touch-align-middle.svg",
      },
      {
        revision: "65c182e6c557aba57b611b8120f4c541_8795",
        url: "assets/icon/touch/gravit-icon-touch-align-panel.svg",
      },
      {
        revision: "5809fb96de298a9af592d859f23efefc_8795",
        url: "assets/icon/touch/gravit-icon-touch-align-right.svg",
      },
      {
        revision: "b8311bd88df9c8c59acabeef3b447ccd_8795",
        url: "assets/icon/touch/gravit-icon-touch-align-top.svg",
      },
      {
        revision: "478a3cc5bdff6bdced1373d9b8bd496c_8795",
        url: "assets/icon/touch/gravit-icon-touch-align.svg",
      },
      {
        revision: "2391a6ef25e9a2484d629215e561920a_8795",
        url: "assets/icon/touch/gravit-icon-touch-appearance-panel.svg",
      },
      {
        revision: "86fc4acd7a03e031ea95971d9fc576e7_8795",
        url: "assets/icon/touch/gravit-icon-touch-appearance.svg",
      },
      {
        revision: "d362cbe3ad4b746e3fd7a45be2e75174_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrange-bring-forward.svg",
      },
      {
        revision: "317345a275ca823d0d59b41ee44c5dc1_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrange-order.svg",
      },
      {
        revision: "b91ecbf64732f6f0593d2f5a10e26e9e_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrange-send-back.svg",
      },
      {
        revision: "0edd3c8e6fca08f9428460f654a594e2_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrange-send-backward.svg",
      },
      {
        revision: "ef1a8dd169f2be2f690f8cd5dae34b4a_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrange-send-front.svg",
      },
      {
        revision: "d2b4c3a0e5645318f6af1a0a0e7c3971_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrow-down.svg",
      },
      {
        revision: "5d9488bae5ba78f6f8fea7a4d880821b_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrow-key-down.svg",
      },
      {
        revision: "49b3bab6422b6c03ffacc2c7656c3974_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrow-key-left.svg",
      },
      {
        revision: "85cc50f40cf795355c628f9795a8c0ee_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrow-key-right.svg",
      },
      {
        revision: "d257d2a4474f97c18c7722040a6f3756_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrow-key-up.svg",
      },
      {
        revision: "66fa251f664a2dd2459a72d8f16bc103_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrow-left.svg",
      },
      {
        revision: "420adf147ee450625e015a001d935cf2_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrow-right.svg",
      },
      {
        revision: "7f415b433ace9f382841c73f2c67aed3_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrow-up.svg",
      },
      {
        revision: "a2e3ee654eba9732ac6f29b4486a7419_8795",
        url: "assets/icon/touch/gravit-icon-touch-arrowDown.svg",
      },
      {
        revision: "2e6428aa4d108032d0a9286a66920719_8795",
        url: "assets/icon/touch/gravit-icon-touch-border.svg",
      },
      {
        revision: "e45574324cd59a495b3866f9a3627c88_8795",
        url: "assets/icon/touch/gravit-icon-touch-check-small.svg",
      },
      {
        revision: "996edb3c4feb9baf89dbed3f1a72b375_8795",
        url: "assets/icon/touch/gravit-icon-touch-comment-docker.svg",
      },
      {
        revision: "da3aee79d4b884812d4271030ae73851_8795",
        url: "assets/icon/touch/gravit-icon-touch-comment.svg",
      },
      {
        revision: "ec37c2da4c5b280f61052676f335ea71_8795",
        url: "assets/icon/touch/gravit-icon-touch-conpletely-fill.svg",
      },
      {
        revision: "d0599f2f31c23f252a6d268bc12c4d44_8795",
        url: "assets/icon/touch/gravit-icon-touch-convert-to-path.svg",
      },
      {
        revision: "24db53aa5b48f7f284210395d58d821f_8795",
        url: "assets/icon/touch/gravit-icon-touch-copy.svg",
      },
      {
        revision: "7c2ff5f98a77f6f2d3efb269d03da50d_8795",
        url: "assets/icon/touch/gravit-icon-touch-dimension.svg",
      },
      {
        revision: "fe63726c1eb076328372439e98e4ef5d_8795",
        url: "assets/icon/touch/gravit-icon-touch-distribute-hor.svg",
      },
      {
        revision: "a642be77cbaff23d6faf920192674e42_8795",
        url: "assets/icon/touch/gravit-icon-touch-distribute-ver.svg",
      },
      {
        revision: "87b25baa3c8e7e9535d071703f8b8332_8795",
        url: "assets/icon/touch/gravit-icon-touch-document.svg",
      },
      {
        revision: "880b313ae291b1af94c7a0ebb56301d2_8795",
        url: "assets/icon/touch/gravit-icon-touch-drag-indicator.svg",
      },
      {
        revision: "e6be6272ec18ec7ea742dda45c44612e_8795",
        url: "assets/icon/touch/gravit-icon-touch-dropdown.svg",
      },
      {
        revision: "d12f791f3196f612782f27dcca8972b4_8795",
        url: "assets/icon/touch/gravit-icon-touch-effect.svg",
      },
      {
        revision: "b10d08c2db4b8a831b2bfeb9bde27d65_8795",
        url: "assets/icon/touch/gravit-icon-touch-effects-panel.svg",
      },
      {
        revision: "cc49763bfb7106feaa13e491a5eaccd5_8795",
        url: "assets/icon/touch/gravit-icon-touch-ends-butt.svg",
      },
      {
        revision: "d29a55d61718e16f24949c8d5f480d85_8795",
        url: "assets/icon/touch/gravit-icon-touch-ends-round.svg",
      },
      {
        revision: "21fca1dfda98da00724940f343ccb958_8795",
        url: "assets/icon/touch/gravit-icon-touch-ends-sqare.svg",
      },
      {
        revision: "806f4d87f99274e8a368b4c636792a12_8795",
        url: "assets/icon/touch/gravit-icon-touch-fill.svg",
      },
      {
        revision: "447e97347ee5f2df262e604fd9bce58a_8795",
        url: "assets/icon/touch/gravit-icon-touch-fullscreen.svg",
      },
      {
        revision: "45513e32f5c3cae3efa3115fd6a7646e_8795",
        url: "assets/icon/touch/gravit-icon-touch-group.svg",
      },
      {
        revision: "385d48a86d84099a6c9aa5cca1a609f5_8795",
        url: "assets/icon/touch/gravit-icon-touch-help.svg",
      },
      {
        revision: "f91daf1182174dc1f7bed195f17c6de3_8795",
        url: "assets/icon/touch/gravit-icon-touch-hide.svg",
      },
      {
        revision: "b59ce167657b52178616b0b6b589bd21_8795",
        url: "assets/icon/touch/gravit-icon-touch-joint-bevel.svg",
      },
      {
        revision: "7ebfcd58f72f8c1a50babb81cf02d892_8795",
        url: "assets/icon/touch/gravit-icon-touch-joint-miter.svg",
      },
      {
        revision: "af0ed022cf8cc3be9a6fc80e64f1a2e6_8795",
        url: "assets/icon/touch/gravit-icon-touch-joint-round.svg",
      },
      {
        revision: "aca52b85d06abdb1b5fdc93c11bc1692_8795",
        url: "assets/icon/touch/gravit-icon-touch-layers-panel.svg",
      },
      {
        revision: "db5fde4c88c0050e60c138d55e65b918_8795",
        url: "assets/icon/touch/gravit-icon-touch-layers.svg",
      },
      {
        revision: "67bb5159c120a6d83f70e5dacc1d0cee_8795",
        url: "assets/icon/touch/gravit-icon-touch-libraries-panel.svg",
      },
      {
        revision: "e39d04f68db48db553810b9ffa88cfff_8795",
        url: "assets/icon/touch/gravit-icon-touch-libraries.svg",
      },
      {
        revision: "84e2ba709e949a34bc2751efdc0e593b_8795",
        url: "assets/icon/touch/gravit-icon-touch-menubar.svg",
      },
      {
        revision: "d91b7ced619f545850a68807fabb0356_8795",
        url: "assets/icon/touch/gravit-icon-touch-newSymbols.svg",
      },
      {
        revision: "d069468adb2e6005964391636bf5ffd2_8795",
        url: "assets/icon/touch/gravit-icon-touch-pages-panel.svg",
      },
      {
        revision: "db4e7c1fb09c350289de36eb7c1e0bf6_8795",
        url: "assets/icon/touch/gravit-icon-touch-pages.svg",
      },
      {
        revision: "fb9c6c5a8aed28ac0634d1801e89414f_8795",
        url: "assets/icon/touch/gravit-icon-touch-paste-and-replace.svg",
      },
      {
        revision: "b373e7240ebe684d55c7b6f122344aff_8795",
        url: "assets/icon/touch/gravit-icon-touch-paste-in-place.svg",
      },
      {
        revision: "49af15f0449efe28c0a573e6c6c83db1_8795",
        url: "assets/icon/touch/gravit-icon-touch-paste-inside-selection.svg",
      },
      {
        revision: "51046a23d99b81209d079c0f2938f2ba_8795",
        url: "assets/icon/touch/gravit-icon-touch-paste-inside.svg",
      },
      {
        revision: "719ce5cd87b904f4561ae8918ffe70a0_8795",
        url: "assets/icon/touch/gravit-icon-touch-paste-style.svg",
      },
      {
        revision: "0593592c862d49df3b5c847ead766e19_8795",
        url: "assets/icon/touch/gravit-icon-touch-paste.svg",
      },
      {
        revision: "1582f0408df6b848362e53e8f956b9b9_8795",
        url: "assets/icon/touch/gravit-icon-touch-picker-1.svg",
      },
      {
        revision: "57dabb864dd736528b60beeaef209f95_8795",
        url: "assets/icon/touch/gravit-icon-touch-picker-2.svg",
      },
      {
        revision: "410dc220fbecc33e29037e863d0be172_8795",
        url: "assets/icon/touch/gravit-icon-touch-plus-A.svg",
      },
      {
        revision: "006b64ff7fabdab3a7509c237e7fed34_8795",
        url: "assets/icon/touch/gravit-icon-touch-plus-B.svg",
      },
      {
        revision: "fe28d09f90e6dc3fcd2dabb8a03dbb9a_8795",
        url: "assets/icon/touch/gravit-icon-touch-plus.svg",
      },
      {
        revision: "ff3e9450f08b60330ecf397de82154c8_8795",
        url: "assets/icon/touch/gravit-icon-touch-position-center.svg",
      },
      {
        revision: "5153481e1c155cb4c4a8042010aa8e61_8795",
        url: "assets/icon/touch/gravit-icon-touch-position-inside.svg",
      },
      {
        revision: "fc8c2095c8fe54eb5e11e407eb16e40c_8795",
        url: "assets/icon/touch/gravit-icon-touch-position-outside.svg",
      },
      {
        revision: "87b8ead6d993d0fabfa38f07b58e25be_8795",
        url: "assets/icon/touch/gravit-icon-touch-Rectangle.svg",
      },
      {
        revision: "a4d4b319d5d4f76fd8a734e56ff9213d_8795",
        url: "assets/icon/touch/gravit-icon-touch-Rectangle2.svg",
      },
      {
        revision: "3ec721711b8133c029735b66e8a1591d_8795",
        url: "assets/icon/touch/gravit-icon-touch-selection.svg",
      },
      {
        revision: "f502cb925743cc7f542a03b3e4f86379_8795",
        url: "assets/icon/touch/gravit-icon-touch-settings.svg",
      },
      {
        revision: "0e9a269000124ef256bb119998787617_8795",
        url: "assets/icon/touch/gravit-icon-touch-show.svg",
      },
      {
        revision: "76226d65f87cd61870bc0234167af3f2_8795",
        url: "assets/icon/touch/gravit-icon-touch-symbols.svg",
      },
      {
        revision: "aa5fc9de21b26e259f2b1402ce594ce9_8795",
        url: "assets/icon/touch/gravit-icon-touch-transform.svg",
      },
      {
        revision: "01677551f8fdfedec51a2738b1756bef_8795",
        url: "assets/icon/touch/gravit-icon-touch-trash-2.svg",
      },
      {
        revision: "d2125143753f76f15445dd5576dc5d20_8795",
        url: "assets/icon/touch/gravit-icon-touch-trash.svg",
      },
      {
        revision: "f4336517cc8b127d8bf3c0b35f8b26b8_8795",
        url: "assets/icon/touch/gravit-icon-touch-ungroup.svg",
      },
      {
        revision: "860191e179cd36284a4ae31bb1b01324_8795",
        url: "assets/icon/touch/gravit-icon-touch-winding-fill.svg",
      },
      {
        revision: "4fbb0c4365600cc53eb993b041d008b4_8795",
        url: "assets/icon/touch/GravitHamburger.svg",
      },
      {
        revision: "93e451a42ecfc03ecb64a92e5c24dd7e_8795",
        url: "assets/icon/touch/group-as-mask.svg",
      },
      {
        revision: "451dfa1dbfc8f84ee53c050b7899cac2_8795",
        url: "assets/icon/touch/group-small.svg",
      },
      {
        revision: "eece0a3906bb5b998652fc0993870e17_8795",
        url: "assets/icon/touch/group.svg",
      },
      {
        revision: "3ca03b09837cb8d9187cf497b4e41457_8795",
        url: "assets/icon/touch/help.svg",
      },
      {
        revision: "f9599bc5e7fb247bad7f1a7d6b1bfeb8_8795",
        url: "assets/icon/touch/hide-big.svg",
      },
      {
        revision: "6081113e410bc6fde61e46a9adb3e0c5_8795",
        url: "assets/icon/touch/hide-small.svg",
      },
      {
        revision: "87719fc4525a80d532a9960f26b4ec73_8795",
        url: "assets/icon/touch/hide.svg",
      },
      {
        revision: "c2c3e326b4bddd9d20eda7f33dc2a87d_8795",
        url: "assets/icon/touch/image-small.svg",
      },
      {
        revision: "32f8d86329bbc71e3f9e4a5b16af600b_8795",
        url: "assets/icon/touch/image.svg",
      },
      {
        revision: "5d01736bce213249da7dbdfaa58f547b_8795",
        url: "assets/icon/touch/import-swatches.svg",
      },
      {
        revision: "0c2b959acff6ad65f81714db111b81d7_8795",
        url: "assets/icon/touch/intersect.svg",
      },
      {
        revision: "796c5e106c5939c56cfcab4739f0c0f1_8795",
        url: "assets/icon/touch/italic-text.svg",
      },
      {
        revision: "800d8014deeb1871685f8ad376fc0dc5_8795",
        url: "assets/icon/touch/join-paths.svg",
      },
      {
        revision: "05fe6d9dd74af7087887ae9507493585_8795",
        url: "assets/icon/touch/joint-bevel.svg",
      },
      {
        revision: "7fd9801aa5760ac01b3b74e416ff0669_8795",
        url: "assets/icon/touch/joint-miter.svg",
      },
      {
        revision: "f57cf1461e5134e443d77ba0664e4467_8795",
        url: "assets/icon/touch/joint-round.svg",
      },
      {
        revision: "a8a5178e654b5472b881200cc9a76d51_8795",
        url: "assets/icon/touch/joints-asymethric.svg",
      },
      {
        revision: "428800c0a08d08ded0800a4133dd876b_8795",
        url: "assets/icon/touch/joints-auto.svg",
      },
      {
        revision: "f0f69e98537424203c22858ca279e276_8795",
        url: "assets/icon/touch/joints-connector.svg",
      },
      {
        revision: "a1cc3cde749088d65456a38a573bb955_8795",
        url: "assets/icon/touch/joints-disconnected.svg",
      },
      {
        revision: "8a8c492349df05f55dacc2ad00495dc4_8795",
        url: "assets/icon/touch/joints-mirrored.svg",
      },
      {
        revision: "c30427080942f1bb86c4a09d1ba331e7_8795",
        url: "assets/icon/touch/joints-straight.svg",
      },
      {
        revision: "8d00f1050c23c00984ef7c298895e181_8795",
        url: "assets/icon/touch/justify-text.svg",
      },
      {
        revision: "bffd5befa9893f6bcd244848268c6b15_8795",
        url: "assets/icon/touch/kebab.svg",
      },
      {
        revision: "2b3b7a33f4b927dd3731fb8e5e55f8b0_8795",
        url: "assets/icon/touch/knife.svg",
      },
      {
        revision: "ed416d94a9c14ed8f7b6e2c6ad77943b_8795",
        url: "assets/icon/touch/lasso.svg",
      },
      {
        revision: "07ab89efc77e8b14168521f8f2daf7fe_8795",
        url: "assets/icon/touch/layer.svg",
      },
      {
        revision: "3ae58334d395544f93ce4e6d716da3fb_8795",
        url: "assets/icon/touch/layers-panel.svg",
      },
      {
        revision: "ed111a4efc1b17b59ced7d190001a8c9_8795",
        url: "assets/icon/touch/libraries-panel.svg",
      },
      {
        revision: "cde1110b96c0f0e6abce49b253f6ccc4_8795",
        url: "assets/icon/touch/ligatures-text.svg",
      },
      {
        revision: "d2ee14e1f8219b1e5fb11a99b5e005b7_8795",
        url: "assets/icon/touch/light/add-swatches.svg",
      },
      {
        revision: "a2f6c88fa2c89117569514a972bd2d5a_8795",
        url: "assets/icon/touch/light/add.svg",
      },
      {
        revision: "d124262362e7d8651f881819eaa77765_8795",
        url: "assets/icon/touch/light/align-bottom-text.svg",
      },
      {
        revision: "f79710841e775791f7249f8ee957ba06_8795",
        url: "assets/icon/touch/light/align-bottom.svg",
      },
      {
        revision: "adc27d33a550002adbc2be965d307824_8795",
        url: "assets/icon/touch/light/align-center-text.svg",
      },
      {
        revision: "3c69026f00e66e680fc103456c40754a_8795",
        url: "assets/icon/touch/light/align-center.svg",
      },
      {
        revision: "4af21c23e92bd9f1737c767d364b93c4_8795",
        url: "assets/icon/touch/light/align-left-text.svg",
      },
      {
        revision: "c8915fa77a032cedea7733418d2ac369_8795",
        url: "assets/icon/touch/light/align-left.svg",
      },
      {
        revision: "9365b6c6e234cbf51d82eb0fc449fa5a_8795",
        url: "assets/icon/touch/light/align-middle-text.svg",
      },
      {
        revision: "6a900c3dba33208c9f886463be39818b_8795",
        url: "assets/icon/touch/light/align-middle.svg",
      },
      {
        revision: "eaba58b40b84d09fdac0021ecd0b8b37_8795",
        url: "assets/icon/touch/light/align-panel.svg",
      },
      {
        revision: "5ea913654a1ec4429fc554becfbd756a_8795",
        url: "assets/icon/touch/light/align-right-text.svg",
      },
      {
        revision: "c61e8b75c41e748de2cb3b8cb1fa31fc_8795",
        url: "assets/icon/touch/light/align-right.svg",
      },
      {
        revision: "0833cb9e62cb937f4fcf1d47d81359c6_8795",
        url: "assets/icon/touch/light/align-top-text.svg",
      },
      {
        revision: "43f3265ae6ff31268d7b8f1a7b047f44_8795",
        url: "assets/icon/touch/light/align-top.svg",
      },
      {
        revision: "7f5bb2374c9c141ce14e25401a7968d5_8795",
        url: "assets/icon/touch/light/anchor-bottom.svg",
      },
      {
        revision: "08266942a1ff6cbec908f13e76f243fe_8795",
        url: "assets/icon/touch/light/anchor-center.svg",
      },
      {
        revision: "53351c48acbacf19d71802a51d8f6ecf_8795",
        url: "assets/icon/touch/light/anchor-letf.svg",
      },
      {
        revision: "e8d65ea60e4c71ac5b12d1d825114e9d_8795",
        url: "assets/icon/touch/light/anchor-middle.svg",
      },
      {
        revision: "0527d7aa48fc18bfacaac4634b31fefd_8795",
        url: "assets/icon/touch/light/anchor-right.svg",
      },
      {
        revision: "ba2020224fe17eda377365a08b812170_8795",
        url: "assets/icon/touch/light/anchor-top.svg",
      },
      {
        revision: "e79aa82a584d7079d4122ddc89f2d20d_8795",
        url: "assets/icon/touch/light/appearance-panel.svg",
      },
      {
        revision: "2918d21ec432c1be7a5b3b0836f1ebf9_8795",
        url: "assets/icon/touch/light/arrange.svg",
      },
      {
        revision: "4a14936b7f64ee5084d5312092606ec9_8795",
        url: "assets/icon/touch/light/arrow-down-small.svg",
      },
      {
        revision: "5346486976652c5501c5ab1678ab92ad_8795",
        url: "assets/icon/touch/light/arrow-down.svg",
      },
      {
        revision: "5660772663ec3c537dacc88f07e3a4cc_8795",
        url: "assets/icon/touch/light/arrow-left-small.svg",
      },
      {
        revision: "a706de19d682a666219401bf2a806bff_8795",
        url: "assets/icon/touch/light/arrow-left.svg",
      },
      {
        revision: "3ea73467e01e4ec16eaee7f3187601d2_8795",
        url: "assets/icon/touch/light/arrow-right.svg",
      },
      {
        revision: "9ecac7a4a4a22349fa7f155eae7b5632_8795",
        url: "assets/icon/touch/light/arrow-up.svg",
      },
      {
        revision: "18c2c195802836d896055fad3d1624c9_8795",
        url: "assets/icon/touch/light/artboard-small.svg",
      },
      {
        revision: "068bcaee61d1c28fecf370471354a591_8795",
        url: "assets/icon/touch/light/artboard.svg",
      },
      {
        revision: "a78a0dd1379a31f6cd19de4d713d8f3f_8795",
        url: "assets/icon/touch/light/attach-to-path.svg",
      },
      {
        revision: "3a5b2b267b386d95c18874529e7e2912_8795",
        url: "assets/icon/touch/light/bezigon.svg",
      },
      {
        revision: "1fbf80423c9fe0161019a58b0d60ee5d_8795",
        url: "assets/icon/touch/light/bold-text.svg",
      },
      {
        revision: "175ad13a9c11843697d74e34f47ae59c_8795",
        url: "assets/icon/touch/light/break-curve.svg",
      },
      {
        revision: "e8b86ff9f15bede4f5a88a27f1e13c5e_8795",
        url: "assets/icon/touch/light/bring-forward.svg",
      },
      {
        revision: "39c99f8dada014996610a1e9f57acf8f_8795",
        url: "assets/icon/touch/light/bring-to-front.svg",
      },
      {
        revision: "24aabba404c91b1991c5869aa990ddfa_8795",
        url: "assets/icon/touch/light/capitalize-text.svg",
      },
      {
        revision: "29ff8f3facaa799fe591601f8bf2b990_8795",
        url: "assets/icon/touch/light/chavron-down-small.svg",
      },
      {
        revision: "57e87b6e60cc6137dd3e90639a3bfc6d_8795",
        url: "assets/icon/touch/light/chavron-up-small.svg",
      },
      {
        revision: "51870bb5b98765d0fd0458c2b83ae625_8795",
        url: "assets/icon/touch/light/check-small.svg",
      },
      {
        revision: "ff886ba226a6c1d7eed7cc47cb1638b0_8795",
        url: "assets/icon/touch/light/check.svg",
      },
      {
        revision: "1f9636b703ebe56e5c1492b00d657b6c_8795",
        url: "assets/icon/touch/light/chevron-down.svg",
      },
      {
        revision: "a17ae246e7ef81ae6ecdd3f894c23710_8795",
        url: "assets/icon/touch/light/chevron-left-small.svg",
      },
      {
        revision: "d1c3c034de08b7918bd70296d085b449_8795",
        url: "assets/icon/touch/light/chevron-left.svg",
      },
      {
        revision: "00cfc610fdda8844d787b317cf9d02a2_8795",
        url: "assets/icon/touch/light/chevron-right-small.svg",
      },
      {
        revision: "d22fe019aa319beda996e301519e4249_8795",
        url: "assets/icon/touch/light/chevron-right.svg",
      },
      {
        revision: "58befe7da65908a5bab9c3f7fecce9e8_8795",
        url: "assets/icon/touch/light/chevron-up.svg",
      },
      {
        revision: "e065a7857a484a5bbc7e361e509878f2_8795",
        url: "assets/icon/touch/light/clip-content-page.svg",
      },
      {
        revision: "b70672c373059a2e51b3a4c59036b652_8795",
        url: "assets/icon/touch/light/clip.svg",
      },
      {
        revision: "39bf43f2fc5eb427e662c96d88377023_8795",
        url: "assets/icon/touch/light/close.svg",
      },
      {
        revision: "575646c68428f0256c43fb3e58371ca4_8795",
        url: "assets/icon/touch/light/cloud-corel.svg",
      },
      {
        revision: "06fdc60d6548e6072e5b73f55c716497_8795",
        url: "assets/icon/touch/light/cloud-google-drive.svg",
      },
      {
        revision: "92a37d8dedabc49d3501e274af04f47a_8795",
        url: "assets/icon/touch/light/cloud-gravit.svg",
      },
      {
        revision: "4e579650a45b3d76354ef37132957bd3_8795",
        url: "assets/icon/touch/light/cloud-sharepoint.svg",
      },
      {
        revision: "5122f7c50ccfce1f8a136c4311afed80_8795",
        url: "assets/icon/touch/light/comments-panel.svg",
      },
      {
        revision: "b498a191fc713ca1b0051d37fdaf0e21_8795",
        url: "assets/icon/touch/light/compound-difference-small.svg",
      },
      {
        revision: "40e7aa1bfb0af722a29924aa633cef75_8795",
        url: "assets/icon/touch/light/compound-intersect-small.svg",
      },
      {
        revision: "b8a9e8504c3adb984003a564faa179f3_8795",
        url: "assets/icon/touch/light/compound-shape-small.svg",
      },
      {
        revision: "fa000e1d33db595115d21fddfb04714d_8795",
        url: "assets/icon/touch/light/compound-subtract-small.svg",
      },
      {
        revision: "43e53f886a697fa39ba311569d4fc69e_8795",
        url: "assets/icon/touch/light/convert-to-outline.svg",
      },
      {
        revision: "cf65a3fe8fb61808aa934637bef90288_8795",
        url: "assets/icon/touch/light/convert-to-path.svg",
      },
      {
        revision: "05d281cf70b906ae7eaedb196f2f3a56_8795",
        url: "assets/icon/touch/light/convert-to-raw-path.svg",
      },
      {
        revision: "9a79a085491aa76737138eff33b53339_8795",
        url: "assets/icon/touch/light/copy-small.svg",
      },
      {
        revision: "d550c10f27d3d3c6adb4ea0976f3e553_8795",
        url: "assets/icon/touch/light/copy.svg",
      },
      {
        revision: "7c2617936ffdc416cb92ee7ac274e50f_8795",
        url: "assets/icon/touch/light/corners-bevel.svg",
      },
      {
        revision: "88eb97eaa4d5c9746651dbc0712cd016_8795",
        url: "assets/icon/touch/light/corners-fancy.svg",
      },
      {
        revision: "34872d44b321e67b215e3efedc296b29_8795",
        url: "assets/icon/touch/light/corners-inset.svg",
      },
      {
        revision: "f86665d6a15ca0b2b699784261179430_8795",
        url: "assets/icon/touch/light/corners-round.svg",
      },
      {
        revision: "3ee7c15579645fb9938cb0d108ebf4ba_8795",
        url: "assets/icon/touch/light/corners-round2.svg",
      },
      {
        revision: "8345bfe6b15151fb62806d31dae5c899_8795",
        url: "assets/icon/touch/light/create-symbol.svg",
      },
      {
        revision: "902bd01248b6d9ee29f577bb25df6588_8795",
        url: "assets/icon/touch/light/crop.svg",
      },
      {
        revision: "061f8b5525e2c79f5e99f9a963ec5e31_8795",
        url: "assets/icon/touch/light/ctrl-point-circle.svg",
      },
      {
        revision: "0872b29e13b6c59f6a10dc20c4af9b0f_8795",
        url: "assets/icon/touch/light/ctrl-point-rhombus.svg",
      },
      {
        revision: "6ed797486487832e80181c54dfeff67e_8795",
        url: "assets/icon/touch/light/cut.svg",
      },
      {
        revision: "425dbed9967dd916640d7a291283b2e7_8795",
        url: "assets/icon/touch/light/delete - small.svg",
      },
      {
        revision: "c98d0c2e8c85da4fe0b080d0e5973459_8795",
        url: "assets/icon/touch/light/delete.svg",
      },
      {
        revision: "ee46fc280d930d7119f20ecc6818a751_8795",
        url: "assets/icon/touch/light/detach-from-path.svg",
      },
      {
        revision: "cedc3d6de7cc5203e0ea954cf2e38295_8795",
        url: "assets/icon/touch/light/detach-symbol.svg",
      },
      {
        revision: "2e45b24f32cf154698091313e7ba3dae_8795",
        url: "assets/icon/touch/light/difference.svg",
      },
      {
        revision: "79987e015a0afa36ff26eb51be02680a_8795",
        url: "assets/icon/touch/light/distribute-hor.svg",
      },
      {
        revision: "2cab510cd90d1fdc1cb6cf3c567c07b9_8795",
        url: "assets/icon/touch/light/distribute-ver.svg",
      },
      {
        revision: "adbe74b1acceb389d5695521f9dd658f_8795",
        url: "assets/icon/touch/light/duplicate.svg",
      },
      {
        revision: "030c0c11693897908359638a0891c652_8795",
        url: "assets/icon/touch/light/effects-panel.svg",
      },
      {
        revision: "ba3a6078b9c9f819e13293f62cc2ea19_8795",
        url: "assets/icon/touch/light/ellipse-closed.svg",
      },
      {
        revision: "63b7b3f550cefb6df02e0ef3dc98574a_8795",
        url: "assets/icon/touch/light/ellipse-open.svg",
      },
      {
        revision: "c4acaa16512aff247b81564ffc540474_8795",
        url: "assets/icon/touch/light/ellipse-pie.svg",
      },
      {
        revision: "bda4cccc2f18df2f957f768d56aa258e_8795",
        url: "assets/icon/touch/light/ellipse-small.svg",
      },
      {
        revision: "2cb4337235f97205d561e40037da32b5_8795",
        url: "assets/icon/touch/light/ellipse.svg",
      },
      {
        revision: "6406705df379b0441967a450cf020fb8_8795",
        url: "assets/icon/touch/light/ends-butt.svg",
      },
      {
        revision: "02d730294a1e0cd714acd3a8f9086915_8795",
        url: "assets/icon/touch/light/ends-round.svg",
      },
      {
        revision: "13a65ce715bf349f6e9b563ce57b0a59_8795",
        url: "assets/icon/touch/light/ends-sqare.svg",
      },
      {
        revision: "d97da65b6743e9a85d17150e9ebdecb9_8795",
        url: "assets/icon/touch/light/expand-shrink.svg",
      },
      {
        revision: "e2e20cca6ea5a8cc7bf314b3b930c915_8795",
        url: "assets/icon/touch/light/export-assets.svg",
      },
      {
        revision: "5c9a103750ed796d1bfb85e4b1ddf949_8795",
        url: "assets/icon/touch/light/export-canvas.svg",
      },
      {
        revision: "19388290dfe52cf806cef7ea60879545_8795",
        url: "assets/icon/touch/light/export-selection.svg",
      },
      {
        revision: "b92030cbf7c133c7c236d40bed0e04da_8795",
        url: "assets/icon/touch/light/export-swatches.svg",
      },
      {
        revision: "4ae0eebff0f88346454fef30308c07c7_8795",
        url: "assets/icon/touch/light/export.svg",
      },
      {
        revision: "3cc6b64da80e1d2f2d4f031cdd288e8f_8795",
        url: "assets/icon/touch/light/extract-colors.svg",
      },
      {
        revision: "5092aa6bf3c9d017645cb6c99c0822aa_8795",
        url: "assets/icon/touch/light/fit-all.svg",
      },
      {
        revision: "7983b3c87ab386f7815d307ac9b6b147_8795",
        url: "assets/icon/touch/light/flatten.svg",
      },
      {
        revision: "1ed3bb40b7199bae194533fc62f4d8fd_8795",
        url: "assets/icon/touch/light/flip-hor.svg",
      },
      {
        revision: "85b1a7b5fa9aed12e0e27fe3365b1921_8795",
        url: "assets/icon/touch/light/flip-ver.svg",
      },
      {
        revision: "120a93fb711dcf577ef98542c5622e33_8795",
        url: "assets/icon/touch/light/folder-close-small.svg",
      },
      {
        revision: "c48c7dc5ed6a3f302d29435f7de113f5_8795",
        url: "assets/icon/touch/light/folder-open-small.svg",
      },
      {
        revision: "bbe09d5aa9cdef77976d0101d55608b7_8795",
        url: "assets/icon/touch/light/fractions-text.svg",
      },
      {
        revision: "ccadb4a0c297e222d313c5d9e0a46329_8795",
        url: "assets/icon/touch/light/freehand-shaping.svg",
      },
      {
        revision: "519c4e11868152e2927777740c619a92_8795",
        url: "assets/icon/touch/light/freehand.svg",
      },
      {
        revision: "2c0bb53047922ae24dd7700b5bfcf7ea_8795",
        url: "assets/icon/touch/light/fullscreen.svg",
      },
      {
        revision: "828f724faf8d88dcdecea7731f89a2b0_8795",
        url: "assets/icon/touch/light/go-to-master.svg",
      },
      {
        revision: "420adf147ee450625e015a001d935cf2_8795",
        url: "assets/icon/touch/light/gravit-icon-touch-arrow-right.svg",
      },
      {
        revision: "dbe4898579360cfce702b54280d1f253_8795",
        url: "assets/icon/touch/light/GravitHamburger.svg",
      },
      {
        revision: "1b9cc69ee93b5185650501c96a8e8e91_8795",
        url: "assets/icon/touch/light/group-as-mask.svg",
      },
      {
        revision: "0a9b3360c6216de9594a89a029786fcf_8795",
        url: "assets/icon/touch/light/group-small.svg",
      },
      {
        revision: "c886229d4e77a141715a361eab3d285b_8795",
        url: "assets/icon/touch/light/group.svg",
      },
      {
        revision: "fe7d60b9299582b8ad6fc766e02bb6c1_8795",
        url: "assets/icon/touch/light/help.svg",
      },
      {
        revision: "8494cac83a11ff20641fb6d48f0ea7d2_8795",
        url: "assets/icon/touch/light/hide-big.svg",
      },
      {
        revision: "73d35873c4f3b0a1478f854984530a81_8795",
        url: "assets/icon/touch/light/hide-small.svg",
      },
      {
        revision: "0422cd488a300cc979d01eb60f69ad59_8795",
        url: "assets/icon/touch/light/hide.svg",
      },
      {
        revision: "094f47f16731766eb98cb2fa9063268f_8795",
        url: "assets/icon/touch/light/image-small.svg",
      },
      {
        revision: "7a42fa9bcb29ff5fb3aee403b5278452_8795",
        url: "assets/icon/touch/light/image.svg",
      },
      {
        revision: "eac1ba030da3545385eee02775dfd615_8795",
        url: "assets/icon/touch/light/import-swatches.svg",
      },
      {
        revision: "3cb6586ea5c14ec2ea01203d92719ada_8795",
        url: "assets/icon/touch/light/intersect.svg",
      },
      {
        revision: "c506c2c00a4d818a95e1e0278694d397_8795",
        url: "assets/icon/touch/light/italic-text.svg",
      },
      {
        revision: "05ad341642a19a000feb5f9b3428762e_8795",
        url: "assets/icon/touch/light/join-paths.svg",
      },
      {
        revision: "ee65d06076dd222183270556bc564735_8795",
        url: "assets/icon/touch/light/joint-bevel.svg",
      },
      {
        revision: "d29c962c3f9f8bdaa28d2beb0fe62f11_8795",
        url: "assets/icon/touch/light/joint-miter.svg",
      },
      {
        revision: "38572a2d2d34c352ccb63345192cedc8_8795",
        url: "assets/icon/touch/light/joint-round.svg",
      },
      {
        revision: "b93743edb43cf6576a78ced7bc873a61_8795",
        url: "assets/icon/touch/light/joints-asymethric.svg",
      },
      {
        revision: "9de5f13670d00897c90ab127615342e0_8795",
        url: "assets/icon/touch/light/joints-auto.svg",
      },
      {
        revision: "498d1cfd0f830170dc5bdfcfad2768cb_8795",
        url: "assets/icon/touch/light/joints-connector.svg",
      },
      {
        revision: "4858824561beb0cc0823c946e2d80601_8795",
        url: "assets/icon/touch/light/joints-disconnected.svg",
      },
      {
        revision: "3e2e0c27991d1461996f07ffb4f7f434_8795",
        url: "assets/icon/touch/light/joints-mirrored.svg",
      },
      {
        revision: "86283c8e965ebfa517aaa5eab39fc3f7_8795",
        url: "assets/icon/touch/light/joints-straight.svg",
      },
      {
        revision: "2a3c1bb27c379811e911b12fb2955901_8795",
        url: "assets/icon/touch/light/justify-text.svg",
      },
      {
        revision: "83e2b618fb9dee67ddec2019e6eabb70_8795",
        url: "assets/icon/touch/light/kebab.svg",
      },
      {
        revision: "4db05617d61978c55284212ad48a42f8_8795",
        url: "assets/icon/touch/light/knife.svg",
      },
      {
        revision: "c32c8de62c3dbb0d54b88008c2094d9a_8795",
        url: "assets/icon/touch/light/lasso.svg",
      },
      {
        revision: "d08a3f0cacaca72e1f094c8774288ede_8795",
        url: "assets/icon/touch/light/layer.svg",
      },
      {
        revision: "a01f51596f72da88c49b1f7659760285_8795",
        url: "assets/icon/touch/light/layers-panel.svg",
      },
      {
        revision: "4302accbe76afefebc4a445cfa6f1182_8795",
        url: "assets/icon/touch/light/libraries-panel.svg",
      },
      {
        revision: "3c1966b5aea4815e84b96ed5662877ce_8795",
        url: "assets/icon/touch/light/ligatures-text.svg",
      },
      {
        revision: "2bb9c2b14b9df39671c3089b33ee2947_8795",
        url: "assets/icon/touch/light/line-small.svg",
      },
      {
        revision: "8584e9a42dbf01c842897d1a7eacb1a6_8795",
        url: "assets/icon/touch/light/line.svg",
      },
      {
        revision: "0b36d16450cc6e71df03bc9c90352bea_8795",
        url: "assets/icon/touch/light/link-image.svg",
      },
      {
        revision: "21eb8a8a2800eaef99afa85df58706ea_8795",
        url: "assets/icon/touch/light/lock-ratio.svg",
      },
      {
        revision: "31ab1d2216c5c94635183ad90edde03e_8795",
        url: "assets/icon/touch/light/lock-small.svg",
      },
      {
        revision: "4b36a279e50a044ea579b223c8a930c4_8795",
        url: "assets/icon/touch/light/lock.svg",
      },
      {
        revision: "9e1f702a8585bf7f1c1749e66ca5ca0b_8795",
        url: "assets/icon/touch/light/lowercase-text.svg",
      },
      {
        revision: "c229490535f2b5bb706a4f7322157dda_8795",
        url: "assets/icon/touch/light/nested-compound.svg",
      },
      {
        revision: "03de4a976898f6d2d3ffcd64ef24010a_8795",
        url: "assets/icon/touch/light/new-layer-group.svg",
      },
      {
        revision: "6dd41ac3671b03398b4fff691d35a81f_8795",
        url: "assets/icon/touch/light/new-page.svg",
      },
      {
        revision: "7951f9c71400920e2f9eb7ab25ab3332_8795",
        url: "assets/icon/touch/light/No.svg",
      },
      {
        revision: "ae8abe3b90ac9a434bde728f99ef6533_8795",
        url: "assets/icon/touch/light/open-cloud.svg",
      },
      {
        revision: "b936bf1e0bc4645d54a6062ae6e3d18a_8795",
        url: "assets/icon/touch/light/open.svg",
      },
      {
        revision: "56ce65c7793be8eea782fce13effe9cd_8795",
        url: "assets/icon/touch/light/original-size-image.svg",
      },
      {
        revision: "645fa972849e7e80d0da6a81ce8f1d4a_8795",
        url: "assets/icon/touch/light/page-imfinity-small.svg",
      },
      {
        revision: "008dc8aec35b7889a1c9b5dc3bc35411_8795",
        url: "assets/icon/touch/light/page-master-small.svg",
      },
      {
        revision: "f446464bd944b3665db6722a14d3c0a3_8795",
        url: "assets/icon/touch/light/page-small.svg",
      },
      {
        revision: "1950708c004fb71b5e3668da189ce2cd_8795",
        url: "assets/icon/touch/light/pages-panel.svg",
      },
      {
        revision: "22dd6a6f149e2e61e4e678107c130d9c_8795",
        url: "assets/icon/touch/light/pan.svg",
      },
      {
        revision: "fb9c6c5a8aed28ac0634d1801e89414f_8795",
        url: "assets/icon/touch/light/paste-and-replace.svg",
      },
      {
        revision: "f9d01c556b5d41eb8c434acb4128ff5b_8795",
        url: "assets/icon/touch/light/paste-color.svg",
      },
      {
        revision: "03f266c0d1c358aaa56dffa6164864d2_8795",
        url: "assets/icon/touch/light/paste-here.svg",
      },
      {
        revision: "b281ff8b78ead7990bd845f25476d591_8795",
        url: "assets/icon/touch/light/paste-in-place.svg",
      },
      {
        revision: "ec49e38136f76db919d2e1f913740bf5_8795",
        url: "assets/icon/touch/light/paste-inside.svg",
      },
      {
        revision: "5b62d53cc4ccc8971a1802d6da245ab7_8795",
        url: "assets/icon/touch/light/paste-small.svg",
      },
      {
        revision: "4bcc1f68f1daea65715e532cb50fe704_8795",
        url: "assets/icon/touch/light/paste-style.svg",
      },
      {
        revision: "943a610cdba2d4c5a314ac37004e8941_8795",
        url: "assets/icon/touch/light/paste.svg",
      },
      {
        revision: "4dc9d048b0a573dae0ae2b3883480ada_8795",
        url: "assets/icon/touch/light/path-small.svg",
      },
      {
        revision: "9618384a84ba9a63ac4e873a7cbc1528_8795",
        url: "assets/icon/touch/light/pen.svg",
      },
      {
        revision: "a7c478a4d6b65aebc8177372d1d77941_8795",
        url: "assets/icon/touch/light/pipette.svg",
      },
      {
        revision: "4541141ff543accac664fbf601b82861_8795",
        url: "assets/icon/touch/light/place-image.svg",
      },
      {
        revision: "6957eed3f8a39246b12ca4fb0b78575c_8795",
        url: "assets/icon/touch/light/play-present.svg",
      },
      {
        revision: "8ead8d04fb553efdeba6a0bd754eabfe_8795",
        url: "assets/icon/touch/light/pointer.svg",
      },
      {
        revision: "093a92820f639f4efa860f19f1d007c4_8795",
        url: "assets/icon/touch/light/polygon-small.svg",
      },
      {
        revision: "abec38bebdf70f85a51465e13330f576_8795",
        url: "assets/icon/touch/light/polygon.svg",
      },
      {
        revision: "9b4570646476387c25c767ab66235942_8795",
        url: "assets/icon/touch/light/position-center.svg",
      },
      {
        revision: "47e202fe5fd29e774a4a20684b87f2a0_8795",
        url: "assets/icon/touch/light/position-inside.svg",
      },
      {
        revision: "9b1da106565e3231ef1c0d3797586b70_8795",
        url: "assets/icon/touch/light/position-outside.svg",
      },
      {
        revision: "4b931625e67ede5b15da990d9f9a96f5_8795",
        url: "assets/icon/touch/light/print.svg",
      },
      {
        revision: "17647b4154bfe7ae9b1b90ae1ddceaad_8795",
        url: "assets/icon/touch/light/proportional-handle.svg",
      },
      {
        revision: "7eaa415a3795ce38397563f153d586c3_8795",
        url: "assets/icon/touch/light/rectangle-small.svg",
      },
      {
        revision: "8f8818b21a150bcd04aa4d0a294a9d11_8795",
        url: "assets/icon/touch/light/rectangle.svg",
      },
      {
        revision: "ae9f6e83ea43ffdeff13a6472a1e79ca_8795",
        url: "assets/icon/touch/light/redo.svg",
      },
      {
        revision: "b2a3d15242f7677369ca12afba3c3710_8795",
        url: "assets/icon/touch/light/refresh.svg",
      },
      {
        revision: "2885951e2fecabfef9fa807626e56d9b_8795",
        url: "assets/icon/touch/light/replace-image.svg",
      },
      {
        revision: "db0998e98d56faf31f93285c24fa54ea_8795",
        url: "assets/icon/touch/light/reset-instance.svg",
      },
      {
        revision: "67eac4a492dbb1920a0f3ad0b5d809ef_8795",
        url: "assets/icon/touch/light/reverse.svg",
      },
      {
        revision: "bfcf301ee800c1d2970b0f683431f2c5_8795",
        url: "assets/icon/touch/light/rotate-canvas.svg",
      },
      {
        revision: "9ae33d0fa9cb0952a89f00bcb04ca923_8795",
        url: "assets/icon/touch/light/rotate-handle.svg",
      },
      {
        revision: "8212fa9eea0498e5f48135123f479c62_8795",
        url: "assets/icon/touch/light/rotate-left.svg",
      },
      {
        revision: "88509109a222b6f8d3f9af515c483f32_8795",
        url: "assets/icon/touch/light/rotate-right.svg",
      },
      {
        revision: "7fda231399991cb87572903d7304f581_8795",
        url: "assets/icon/touch/light/same-height-light.svg",
      },
      {
        revision: "7fda231399991cb87572903d7304f581_8795",
        url: "assets/icon/touch/light/same-height.svg",
      },
      {
        revision: "5a67d789878a207c663364af6e2fb1e4_8795",
        url: "assets/icon/touch/light/same-width-light.svg",
      },
      {
        revision: "5a67d789878a207c663364af6e2fb1e4_8795",
        url: "assets/icon/touch/light/same-width.svg",
      },
      {
        revision: "aaaa8dedc1e6083ef710e4fc372e4fb5_8795",
        url: "assets/icon/touch/light/save-cloud.svg",
      },
      {
        revision: "dcdc5d1eaff7fa49c665c155a7b64f3a_8795",
        url: "assets/icon/touch/light/save.svg",
      },
      {
        revision: "ae229b073cd994524c58e964b170dae3_8795",
        url: "assets/icon/touch/light/search.svg",
      },
      {
        revision: "d1e62b1f743e449db587cba86b402476_8795",
        url: "assets/icon/touch/light/select-by-font.svg",
      },
      {
        revision: "efa93a0cf9562f47aaff7ef00242f2d7_8795",
        url: "assets/icon/touch/light/select-deselect-all.svg",
      },
      {
        revision: "1dfb5053b2486d34f88ddda8e22646c5_8795",
        url: "assets/icon/touch/light/send-backward.svg",
      },
      {
        revision: "ed762a05bfd957c1630e3711ade45bfb_8795",
        url: "assets/icon/touch/light/send-to-back.svg",
      },
      {
        revision: "e778f96f774cd1ee5ee4b3d8a174f93a_8795",
        url: "assets/icon/touch/light/Settings-2.svg",
      },
      {
        revision: "84876b29fcbc4b7e9b45570566899512_8795",
        url: "assets/icon/touch/light/settings.svg",
      },
      {
        revision: "1fd7fab6e0babdf6440044faa7e38fa1_8795",
        url: "assets/icon/touch/light/shapes.svg",
      },
      {
        revision: "6b64f7b79c604f7d96539dffcb37b5ba_8795",
        url: "assets/icon/touch/light/show-big.svg",
      },
      {
        revision: "b8ae9a16ee3f3a3f69255c1fcd3f7bb2_8795",
        url: "assets/icon/touch/light/show-small.svg",
      },
      {
        revision: "d07d63aa8e403ff2550f4771c6f16016_8795",
        url: "assets/icon/touch/light/show.svg",
      },
      {
        revision: "782efaae4a430be4bb98da07ff2423fe_8795",
        url: "assets/icon/touch/light/simplity.svg",
      },
      {
        revision: "74ca7238c1c34f7aa71e1f4cd0440d13_8795",
        url: "assets/icon/touch/light/skew-hor-handle.svg",
      },
      {
        revision: "9616b57044c2a8b3628ccace5c240ca0_8795",
        url: "assets/icon/touch/light/skew-ver-handle.svg",
      },
      {
        revision: "fed941491ed4e557ea505fe463943c89_8795",
        url: "assets/icon/touch/light/slice.svg",
      },
      {
        revision: "93c2d5c007b58693d5e88a3e36a704b8_8795",
        url: "assets/icon/touch/light/smalcaps-text.svg",
      },
      {
        revision: "08b2af0b5cb2506a31df49c7f77009b3_8795",
        url: "assets/icon/touch/light/snap-to-full-light.svg",
      },
      {
        revision: "08b2af0b5cb2506a31df49c7f77009b3_8795",
        url: "assets/icon/touch/light/snap-to-full.svg",
      },
      {
        revision: "614a9a9e3621a1f7409baff98ac0fd36_8795",
        url: "assets/icon/touch/light/snap-to-half-light.svg",
      },
      {
        revision: "614a9a9e3621a1f7409baff98ac0fd36_8795",
        url: "assets/icon/touch/light/snap-to-half.svg",
      },
      {
        revision: "40b75343cfeae411e8d814fef335edac_8795",
        url: "assets/icon/touch/light/snap.svg",
      },
      {
        revision: "1628cfc7ff36a31cdbe3b0ae6484e35b_8795",
        url: "assets/icon/touch/light/split-path.svg",
      },
      {
        revision: "fc35dcdc09d8f1b4b8e974123adea70a_8795",
        url: "assets/icon/touch/light/star.svg",
      },
      {
        revision: "1f9be8a7c60902a82ec20552c827777a_8795",
        url: "assets/icon/touch/light/strikethrough-text.svg",
      },
      {
        revision: "c868a1c7d5d6aa42afa79b596ddb7195_8795",
        url: "assets/icon/touch/light/subscript-text.svg",
      },
      {
        revision: "16874f5f09b6e29b5d5e98fca9164cde_8795",
        url: "assets/icon/touch/light/subselect.svg",
      },
      {
        revision: "83d34e1f5ef569b0a235a96b512c6ecd_8795",
        url: "assets/icon/touch/light/subtract.svg",
      },
      {
        revision: "f4eb34b477a5c6005e26d2006f5d8c87_8795",
        url: "assets/icon/touch/light/supscript-text.svg",
      },
      {
        revision: "a487d574860d1af2f57e602a606e76c7_8795",
        url: "assets/icon/touch/light/symbol-instance-small.svg",
      },
      {
        revision: "53d9135f613a029d31347ec4a1a2535a_8795",
        url: "assets/icon/touch/light/symbol-master-small.svg",
      },
      {
        revision: "28a1d63a3a00abc1111df918344ba7e1_8795",
        url: "assets/icon/touch/light/symbols-panel.svg",
      },
      {
        revision: "ba994b0fb22b4d025ba3fbd2c9e44a17_8795",
        url: "assets/icon/touch/light/text-small.svg",
      },
      {
        revision: "55ae7f5c3f45da23b30906d6ca56363e_8795",
        url: "assets/icon/touch/light/text.svg",
      },
      {
        revision: "73ea9f383bebc05f97ba11e91635316a_8795",
        url: "assets/icon/touch/light/toggle-outline-small.svg",
      },
      {
        revision: "4e8846fc863c962c0b2680fb66e43f18_8795",
        url: "assets/icon/touch/light/touch-disable.svg",
      },
      {
        revision: "244c8eef036d13857d651e94763e4630_8795",
        url: "assets/icon/touch/light/touch.svg",
      },
      {
        revision: "706c9d730b65873955b7aea696eb7b10_8795",
        url: "assets/icon/touch/light/transform-handle.svg",
      },
      {
        revision: "e4c26186e7b37314d00472d0bb8b0064_8795",
        url: "assets/icon/touch/light/transform-panel-old.svg",
      },
      {
        revision: "069e8b70fe698ff6ffca6b1bad69bf5d_8795",
        url: "assets/icon/touch/light/transform-panel.svg",
      },
      {
        revision: "c641d7b9f59dbf54422061b0c5858834_8795",
        url: "assets/icon/touch/light/triangle.svg",
      },
      {
        revision: "7ee9045e21774dcb406002f4479d79d9_8795",
        url: "assets/icon/touch/light/trim-canvas.svg",
      },
      {
        revision: "69e0212d6fab21cccd925a8535147d6b_8795",
        url: "assets/icon/touch/light/underline-text.svg",
      },
      {
        revision: "d7f2a91aa1dbc1470dbb6c18337a6abb_8795",
        url: "assets/icon/touch/light/undo.svg",
      },
      {
        revision: "302879b67be38074f29fb486fce45bc4_8795",
        url: "assets/icon/touch/light/ungroup.svg",
      },
      {
        revision: "0cee999022f0a547ccd8f0c4b24ce4b8_8795",
        url: "assets/icon/touch/light/union.svg",
      },
      {
        revision: "56aca0b9231f0cb9eddd2ad63a060d20_8795",
        url: "assets/icon/touch/light/unlock-ratio.svg",
      },
      {
        revision: "7f0b21a64f22e0f1e141af4ac8091862_8795",
        url: "assets/icon/touch/light/unlock-small.svg",
      },
      {
        revision: "457e63fb59977c9eebbd9032f1db0cc7_8795",
        url: "assets/icon/touch/light/unlock.svg",
      },
      {
        revision: "d3251f545d2703fe3ebbc3f222c10df0_8795",
        url: "assets/icon/touch/light/uppercase-text.svg",
      },
      {
        revision: "ac142d3e0c096dbb6ecec26a09265c00_8795",
        url: "assets/icon/touch/light/vectorize-border.svg",
      },
      {
        revision: "bca8b277902e01fcc27d733ca2606f8a_8795",
        url: "assets/icon/touch/light/version-history.svg",
      },
      {
        revision: "ce29cbcc2edb16e92069d211095917c4_8795",
        url: "assets/icon/touch/light/winding-fill-even-odd.svg",
      },
      {
        revision: "3a1b28b28d92e38399bb4dfb7a1f9573_8795",
        url: "assets/icon/touch/light/winding-fill-non-zero.svg",
      },
      {
        revision: "c9dd7e48fb9414060911ccdcb87e7430_8795",
        url: "assets/icon/touch/light/zoom-in.svg",
      },
      {
        revision: "c079072c4bec370f41d14e204b9f60d0_8795",
        url: "assets/icon/touch/light/zoom-out.svg",
      },
      {
        revision: "ebf66fadf806cc1f3651e37a2cc96c36_8795",
        url: "assets/icon/touch/line-small.svg",
      },
      {
        revision: "023f44d84d18b9a83c1d5a101d52b8ae_8795",
        url: "assets/icon/touch/line.svg",
      },
      {
        revision: "58c2e365386326a3e76d7bea85da1be7_8795",
        url: "assets/icon/touch/link-image.svg",
      },
      {
        revision: "5f6486b306cb385f9c814618cc3c18d9_8795",
        url: "assets/icon/touch/lock-ratio.svg",
      },
      {
        revision: "b5cad33f21dd2f64dfec25f19047340a_8795",
        url: "assets/icon/touch/lock-small.svg",
      },
      {
        revision: "0d7ae59f254cdc571cecade7d984c9b6_8795",
        url: "assets/icon/touch/lock.svg",
      },
      {
        revision: "080da58907fee4a21e122f1d56584dd0_8795",
        url: "assets/icon/touch/lowercase-text.svg",
      },
      {
        revision: "e32aaaffbaeb101b1a3deae33a426b27_8795",
        url: "assets/icon/touch/nested-compound.svg",
      },
      {
        revision: "4d4049cc278a73d8230122102535b5d1_8795",
        url: "assets/icon/touch/new-layer-group.svg",
      },
      {
        revision: "a8d79e01e140d2b6caf34d4ce4c05dc1_8795",
        url: "assets/icon/touch/new-page.svg",
      },
      {
        revision: "77f132a02cb9333451d6ced067da003d_8795",
        url: "assets/icon/touch/No.svg",
      },
      {
        revision: "ed2b7878b1687c3563af74aef734cac6_8795",
        url: "assets/icon/touch/open-cloud.svg",
      },
      {
        revision: "cb7187b3748b065675b408c382b10cf6_8795",
        url: "assets/icon/touch/open.svg",
      },
      {
        revision: "6d9e72cc893bbd6d55c088660d3c5ca5_8795",
        url: "assets/icon/touch/original-size-image.svg",
      },
      {
        revision: "23877b5399a3584eb9a1cc5bc9e60ae3_8795",
        url: "assets/icon/touch/page-imfinity-small.svg",
      },
      {
        revision: "d77429b8966c629bbb5ce5f9ece3aa8e_8795",
        url: "assets/icon/touch/page-master-small.svg",
      },
      {
        revision: "9eb85949a8a91e797417262b20eaa2c5_8795",
        url: "assets/icon/touch/page-small.svg",
      },
      {
        revision: "d219522464220ce73c8c10e4cf582705_8795",
        url: "assets/icon/touch/pages-panel.svg",
      },
      {
        revision: "f3fb36b8045305c20c2854eecc090328_8795",
        url: "assets/icon/touch/pan.svg",
      },
      {
        revision: "a7a07964aba4bf508c179fc938f53db2_8795",
        url: "assets/icon/touch/paste-and-replace.svg",
      },
      {
        revision: "b1956cfcfd8a5229c9fb50e87fe3c542_8795",
        url: "assets/icon/touch/paste-color.svg",
      },
      {
        revision: "ced6477504cbda94976c453244c239b7_8795",
        url: "assets/icon/touch/paste-here.svg",
      },
      {
        revision: "21f68c4ae3ef6dc72919c7338885c640_8795",
        url: "assets/icon/touch/paste-in-place.svg",
      },
      {
        revision: "3d01bbea8616e0da8c8e157b0197e706_8795",
        url: "assets/icon/touch/paste-inside.svg",
      },
      {
        revision: "5fc3bd3f543034002da2d27c6e6bfe52_8795",
        url: "assets/icon/touch/paste-small.svg",
      },
      {
        revision: "33f2da69e0fc319f0b9f6a29ab20eab9_8795",
        url: "assets/icon/touch/paste-style.svg",
      },
      {
        revision: "e4baaf2c55f817ec140099b7d46b7780_8795",
        url: "assets/icon/touch/paste.svg",
      },
      {
        revision: "01ed1c1ceb30d845adf6af5953cf063c_8795",
        url: "assets/icon/touch/path-small.svg",
      },
      {
        revision: "c8f3f45f4ff6f1ecf44decacedddee86_8795",
        url: "assets/icon/touch/pen.svg",
      },
      {
        revision: "05b68753230ef8f3189c4b51be8fc5e0_8795",
        url: "assets/icon/touch/pipette.svg",
      },
      {
        revision: "bff9918973cce5bcf1e3c802af74d5f7_8795",
        url: "assets/icon/touch/place-image.svg",
      },
      {
        revision: "52d67a52141efcc5445c10df7861afcf_8795",
        url: "assets/icon/touch/play-present.svg",
      },
      {
        revision: "521a1b46db040128b90a60fefc939656_8795",
        url: "assets/icon/touch/pointer.svg",
      },
      {
        revision: "5a5548469329cebcdc8474929c93803d_8795",
        url: "assets/icon/touch/polygon-small.svg",
      },
      {
        revision: "d5d86e5570432c5487b2dffc723cfdf7_8795",
        url: "assets/icon/touch/polygon.svg",
      },
      {
        revision: "a11328bf5702b6314ce1fd88b6d76422_8795",
        url: "assets/icon/touch/position-center.svg",
      },
      {
        revision: "33f7f70686d823a527bee798d83f08d5_8795",
        url: "assets/icon/touch/position-inside.svg",
      },
      {
        revision: "12895c12bafa2473c82170d2d11146eb_8795",
        url: "assets/icon/touch/position-outside.svg",
      },
      {
        revision: "00e045da8621528ed4db69f24cffa64a_8795",
        url: "assets/icon/touch/print.svg",
      },
      {
        revision: "17647b4154bfe7ae9b1b90ae1ddceaad_8795",
        url: "assets/icon/touch/proportional-handle.svg",
      },
      {
        revision: "25c2bd4139ff57e4e25f2a633ab553c6_8795",
        url: "assets/icon/touch/rectangle-small.svg",
      },
      {
        revision: "b5e52ff71647f3e4ed3c4ac9692e7dad_8795",
        url: "assets/icon/touch/rectangle.svg",
      },
      {
        revision: "06ca56e46b219d56d3347d8f8ecefcb4_8795",
        url: "assets/icon/touch/redo.svg",
      },
      {
        revision: "d13893f350d1a04a2f67a7978053daf2_8795",
        url: "assets/icon/touch/refresh.svg",
      },
      {
        revision: "9cec7ae1339e48b23731c0eb151ec1b4_8795",
        url: "assets/icon/touch/replace-image.svg",
      },
      {
        revision: "db5ae86e32f1bb0e7c19e400b5a1ebbb_8795",
        url: "assets/icon/touch/reset-instance.svg",
      },
      {
        revision: "eb5531de617f5f7f86ce057f922a3ebd_8795",
        url: "assets/icon/touch/reverse.svg",
      },
      {
        revision: "8295968078799eb5bce4e009e2f9f3db_8795",
        url: "assets/icon/touch/rotate-canvas.svg",
      },
      {
        revision: "9ae33d0fa9cb0952a89f00bcb04ca923_8795",
        url: "assets/icon/touch/rotate-handle.svg",
      },
      {
        revision: "fd1e507aa159c5cff44611997d8faedc_8795",
        url: "assets/icon/touch/rotate-left.svg",
      },
      {
        revision: "0e99681188f3c5e9412c836169d59477_8795",
        url: "assets/icon/touch/rotate-right.svg",
      },
      {
        revision: "46e55fad612ad7b55366af4c0682a348_8795",
        url: "assets/icon/touch/same-height.svg",
      },
      {
        revision: "f058608788fae32680cf7499f25bb2d1_8795",
        url: "assets/icon/touch/same-width.svg",
      },
      {
        revision: "e088f5cd64d08b1381cec1c6994aaf9d_8795",
        url: "assets/icon/touch/save-cloud.svg",
      },
      {
        revision: "8e52a04150e4529a944334c88b31d4ac_8795",
        url: "assets/icon/touch/save.svg",
      },
      {
        revision: "7b1e84d03bb727ab2534396fb5805387_8795",
        url: "assets/icon/touch/search.svg",
      },
      {
        revision: "4a1c6a558d48b542423e92aaaeea8861_8795",
        url: "assets/icon/touch/select-by-font.svg",
      },
      {
        revision: "2d0db770797c637e83069fcf5ecc3558_8795",
        url: "assets/icon/touch/select-deselect-all.svg",
      },
      {
        revision: "bfb233ddc6d0ea26912598196a2a8f83_8795",
        url: "assets/icon/touch/send-backward.svg",
      },
      {
        revision: "4d95de2a12d5ec4d93772e8bcd9216d6_8795",
        url: "assets/icon/touch/send-to-back.svg",
      },
      {
        revision: "ed66eb9a36f1f753454a2c8a9f971b5e_8795",
        url: "assets/icon/touch/Settings-2.svg",
      },
      {
        revision: "4b7081fe2756f6d08c99f0b897c1a5bd_8795",
        url: "assets/icon/touch/settings.svg",
      },
      {
        revision: "6c29bdcd23abd232723e1aa549d6a8fb_8795",
        url: "assets/icon/touch/shapes.svg",
      },
      {
        revision: "aa79036274c05a353220d3c943563c05_8795",
        url: "assets/icon/touch/show-big.svg",
      },
      {
        revision: "1a5cd4b5567c03c928f259c0f7ee34f9_8795",
        url: "assets/icon/touch/show-small.svg",
      },
      {
        revision: "6485578bfea6d864d2d3efb221edadeb_8795",
        url: "assets/icon/touch/show.svg",
      },
      {
        revision: "e4fb21e95ddd923787b99d2ecfc90fae_8795",
        url: "assets/icon/touch/simplity.svg",
      },
      {
        revision: "74ca7238c1c34f7aa71e1f4cd0440d13_8795",
        url: "assets/icon/touch/skew-hor-handle.svg",
      },
      {
        revision: "9616b57044c2a8b3628ccace5c240ca0_8795",
        url: "assets/icon/touch/skew-ver-handle.svg",
      },
      {
        revision: "84a3d5c79d86467da586dd869c2403fb_8795",
        url: "assets/icon/touch/slice.svg",
      },
      {
        revision: "7e8263bb5a37f39fe106e91283d7f544_8795",
        url: "assets/icon/touch/smalcaps-text.svg",
      },
      {
        revision: "f817e05cde8ef34d7d606876d1b9f176_8795",
        url: "assets/icon/touch/snap-to-full.svg",
      },
      {
        revision: "2b2d2667350a9e31d8f4714c16aba736_8795",
        url: "assets/icon/touch/snap-to-half.svg",
      },
      {
        revision: "0ee654671c0d61e816b898cf0349c891_8795",
        url: "assets/icon/touch/snap.svg",
      },
      {
        revision: "4fe5b492c14b5305ef9b42f8449df5df_8795",
        url: "assets/icon/touch/split-path.svg",
      },
      {
        revision: "4b984f066752dce6d2ebd2c0c10dc84a_8795",
        url: "assets/icon/touch/star.svg",
      },
      {
        revision: "391bba3ce3c2363258e7b2593719f445_8795",
        url: "assets/icon/touch/strikethrough-text.svg",
      },
      {
        revision: "e85ecd68482c457a6e57d686c8a382c5_8795",
        url: "assets/icon/touch/subscript-text.svg",
      },
      {
        revision: "601373416ef556b5d23742b193b26a2d_8795",
        url: "assets/icon/touch/subselect.svg",
      },
      {
        revision: "4f322fce8d7aeca6c3612cba88ad75fb_8795",
        url: "assets/icon/touch/subtract.svg",
      },
      {
        revision: "c3678006e80f521da704cfee9d6fbd48_8795",
        url: "assets/icon/touch/supscript-text.svg",
      },
      {
        revision: "4056b101944e8b8870e89012365cfc7e_8795",
        url: "assets/icon/touch/symbol-instance-small.svg",
      },
      {
        revision: "79f9dfe03efd3dd46dc79470584964c9_8795",
        url: "assets/icon/touch/symbol-master-small.svg",
      },
      {
        revision: "b2d098ae478fb328caf27f13042d914c_8795",
        url: "assets/icon/touch/symbols-panel.svg",
      },
      {
        revision: "da6c7ab4f0ad36820457dead826cb64e_8795",
        url: "assets/icon/touch/text-small.svg",
      },
      {
        revision: "3c894e4bb8fe11fb45296fffe48b1597_8795",
        url: "assets/icon/touch/text.svg",
      },
      {
        revision: "538dc473faabd26dc1edf7773ed15a14_8795",
        url: "assets/icon/touch/toggle-outline-small.svg",
      },
      {
        revision: "4af8def5ef7e2e696032fe80b33f49e3_8795",
        url: "assets/icon/touch/touch-disable.svg",
      },
      {
        revision: "ad4d8d770301d4f28cd4679a23a08950_8795",
        url: "assets/icon/touch/touch.svg",
      },
      {
        revision: "706c9d730b65873955b7aea696eb7b10_8795",
        url: "assets/icon/touch/transform-handle.svg",
      },
      {
        revision: "0e80fe6da26165139ba661dfac63920e_8795",
        url: "assets/icon/touch/transform-panel-old.svg",
      },
      {
        revision: "04ed931c5743b744d9045584b4fe6956_8795",
        url: "assets/icon/touch/transform-panel.svg",
      },
      {
        revision: "445ac97b1ebd066b95282e74b2a9fb57_8795",
        url: "assets/icon/touch/triangle.svg",
      },
      {
        revision: "6f61f8ed9167edb379b7f3ab05589ed9_8795",
        url: "assets/icon/touch/trim-canvas.svg",
      },
      {
        revision: "f50898f5dd75cce6c102ef2091d2a931_8795",
        url: "assets/icon/touch/unchecked-dark.svg",
      },
      {
        revision: "b20c73b776b845384574ca635fe9a01b_8795",
        url: "assets/icon/touch/unchecked-light.svg",
      },
      {
        revision: "edca9fa142ac321f80c2979a7a6d1e5c_8795",
        url: "assets/icon/touch/underline-text.svg",
      },
      {
        revision: "70eb9bc05ef7ba7d287204281a895052_8795",
        url: "assets/icon/touch/undo.svg",
      },
      {
        revision: "f8e1e167f71e9d177b9f6d006db67c78_8795",
        url: "assets/icon/touch/ungroup.svg",
      },
      {
        revision: "a71c01af725c5df55b70091ab8981194_8795",
        url: "assets/icon/touch/union.svg",
      },
      {
        revision: "695b4f5777e4d255ad14a55975419473_8795",
        url: "assets/icon/touch/unlock-ratio.svg",
      },
      {
        revision: "2eaf48da241ae09a2e926c779bb61a21_8795",
        url: "assets/icon/touch/unlock-small.svg",
      },
      {
        revision: "5f1593237bce8fd97e853b1ae0dcff5a_8795",
        url: "assets/icon/touch/unlock.svg",
      },
      {
        revision: "db6a42851eb1d3926039a9c5ff63dbdd_8795",
        url: "assets/icon/touch/uppercase-text.svg",
      },
      {
        revision: "17f07064853d160fedbf783c3f7fe9c7_8795",
        url: "assets/icon/touch/vectorize-border.svg",
      },
      {
        revision: "1762a24146a7db80af4809177f7d3a9c_8795",
        url: "assets/icon/touch/version-history.svg",
      },
      {
        revision: "fad85d2653e7f8d256cb808062a3fcf2_8795",
        url: "assets/icon/touch/winding-fill-even-odd.svg",
      },
      {
        revision: "d437642937938c452035557a15e44f51_8795",
        url: "assets/icon/touch/winding-fill-non-zero.svg",
      },
      {
        revision: "7def2a9b2f158ae4948e2e92248dfc8a_8795",
        url: "assets/icon/touch/zoom-in.svg",
      },
      {
        revision: "bcc982fb80fe13ece7e0be0507a77b7e_8795",
        url: "assets/icon/touch/zoom-out.svg",
      },
      {
        revision: "6908f0090f9cb301e52bb739c9c8ec3a_8795",
        url: "assets/icon/ui.jpg",
      },
      {
        revision: "48e48bb8fc993d08e468e1f231c26332_8795",
        url: "assets/icon/unsharp_mask.jpg",
      },
      {
        revision: "3014ecc336597fa7fb339886a4dda42c_8795",
        url: "assets/icon/versions_dark.svg",
      },
      {
        revision: "2909585666adeea1dcedb9a5a1959710_8795",
        url: "assets/icon/versions_light.svg",
      },
      {
        revision: "b662dffe024179d6e7560e53d8554ef3_8795",
        url: "assets/icon/versus.svg",
      },
      {
        revision: "7bf7ea91e7ce494dffecc04d4382fad0_8795",
        url: "assets/icon/vibrance.jpg",
      },
      {
        revision: "b0402143f9e2c44487087f8b78e9c108_8795",
        url: "assets/icon/vignette.jpg",
      },
      {
        revision: "a82cea0a158cc126f22f4954972573f6_8795",
        url: "assets/icon/warning.svg",
      },
      {
        revision: "513770bc3bfb1a437c308775fade15d8_8795",
        url: "assets/icon/welcome.svg",
      },
      {
        revision: "6470d34f83e21e44a7b10e6e6573521a_8795",
        url: "assets/icon/x-delete.svg",
      },
      {
        revision: "ab947c10e0f35658995ecb4cc4ebf184_8795",
        url: "assets/icon/zoom_blur.jpg",
      },
      {
        revision: "bb1de4e13d14e0c55d3679525713c9ea_8795",
        url: "assets/img/brand/gravit-designer.svg",
      },
      {
        revision: "5dbd7992273ca0d08b3e2a243425e625_8795",
        url: "assets/img/brand/logo_rect.png",
      },
      {
        revision: "6fc5f0e3e85335bb2206995e3faab223_8795",
        url: "assets/img/brand/logo.png",
      },
      {
        revision: "00fb17f23563fd5f2398a2671c33ee7b_8795",
        url: "assets/img/brand/logo.svg",
      },
      {
        revision: "b5b98be3bdde5dd6a2bc0213ab183c79_8795",
        url: "assets/img/brand/notification-logo.png",
      },
      {
        revision: "3fe36c42c735c7e224017d701f534afe_8795",
        url: "assets/img/brand/watermark.png",
      },
      {
        revision: "ffaff4f8c0b7971f3ed47484ffea79ab_8795",
        url: "assets/img/cloud/cloud_login_bg.png",
      },
      {
        revision: "14a6345fe0784f2dab715ed6e68b1138_8795",
        url: "assets/img/cloud/cloud_login_dialog_bg.jpeg",
      },
      {
        revision: "c541c90f15b64a0b882df8cbe95cfbf9_8795",
        url: "assets/img/cloud/cloud_logo_white.svg",
      },
      {
        revision: "7b528f551b99d3beaab9795e583e1746_8795",
        url: "assets/img/cloud/cloud-login-background.svg",
      },
      {
        revision: "819bacbf4236ca36a5044a57edf8f23f_8795",
        url: "assets/img/cloud/cloud.svg",
      },
      {
        revision: "ecbdca7dc6d1e59185a5c60fb05d2c0e_8795",
        url: "assets/img/cloud/cloudbg.png",
      },
      {
        revision: "d06b3fffe1132e27c00f0dd00e850cb3_8795",
        url: "assets/img/cloud/default-file-preview.svg",
      },
      {
        revision: "7578a2d7acf735c373b3a747df4cd3e4_8795",
        url: "assets/img/cloud/facebook.svg",
      },
      {
        revision: "2bf9e12dc1cda786aebd814138d6dab2_8795",
        url: "assets/img/cloud/google.svg",
      },
      {
        revision: "3fc7b227ff1fdd121b7aad02cd7b05c4_8795",
        url: "assets/img/cloud/googledrive-file.ico.svg",
      },
      {
        revision: "077384acc8b705a55aa2f6c3ea808540_8795",
        url: "assets/img/cloud/gravitcloud-file.ico.svg",
      },
      {
        revision: "1e509b056496a488b70826a5d30cfe60_8795",
        url: "assets/img/cloud/loginwall-dialog-background.svg",
      },
      {
        revision: "8b78e77266f62aafe9a9a596078276d0_8795",
        url: "assets/img/cloud/loginwall-dialog-gift.svg",
      },
      {
        revision: "3c11ff915d4fe4fe8a83c8e99ad5828d_8795",
        url: "assets/img/cloud/offline.svg",
      },
      {
        revision: "b7a2717efbe42db3a78afbd635afc8ac_8795",
        url: "assets/img/cloud/pro-background.svg",
      },
      {
        revision: "24c9ab84e09a78c19e9f91a64bf8cada_8795",
        url: "assets/img/cloud/pro-badge.svg",
      },
      {
        revision: "bfb8c3100f0b1f1c148c5341be936dcd_8795",
        url: "assets/img/cloud/pro-discount.svg",
      },
      {
        revision: "da54261d18575d0f03a640ff4928bc23_8795",
        url: "assets/img/cloud/sharepoint-file.ico.svg",
      },
      {
        revision: "77b4e12fcf4fcfc48c4a63b163011f61_8795",
        url: "assets/img/cloud/signup.svg",
      },
      {
        revision: "bb81a4fb412cb692fe8d1d5be51c3453_8795",
        url: "assets/img/cloud/templates.png",
      },
      {
        revision: "78e1e4a3d8b1dac7384ffb4494599854_8795",
        url: "assets/img/dialog/background.svg",
      },
      {
        revision: "36ee46afc8bf1abfa078d14183cce5cc_8795",
        url: "assets/img/dialog/install-pwa-header.svg",
      },
      {
        revision: "7bbce4962d7a2afad80115cdbc473c02_8795",
        url: "assets/img/dmg-builder/dmg-bg.png",
      },
      {
        revision: "bae178d50127ae6375cabbfdc73cdc95_8795",
        url: "assets/img/new-document/custom-size.svg",
      },
      {
        revision: "81171d5c97c0b9bcd540b020d74aa6ad_8795",
        url: "assets/img/new-document/open-file.svg",
      },
      {
        revision: "327ff12909c5802184a31b6265815e26_8795",
        url: "assets/img/new-document/play-video.svg",
      },
      {
        revision: "5523ad377930ad39fcc66773a9588690_8795",
        url: "assets/img/new-document/preset-merch-black.svg",
      },
      {
        revision: "cada5c25f52a37474dbf80f9d649b3f4_8795",
        url: "assets/img/new-document/preset-merch-white.svg",
      },
      {
        revision: "516c922abd2073dc3a0163aba1404594_8795",
        url: "assets/img/new-document/preset-print-black.svg",
      },
      {
        revision: "d65ed3a82a257c14a490b2369ce2f746_8795",
        url: "assets/img/new-document/preset-print-white.svg",
      },
      {
        revision: "d65c426791f388b620191606cb6c1410_8795",
        url: "assets/img/new-document/preset-screen-black.svg",
      },
      {
        revision: "b41443c60dcb35cf8c682577c98ff481_8795",
        url: "assets/img/new-document/preset-screen-white.svg",
      },
      {
        revision: "dacd60e64ec3f9e3adbb35713995b98e_8795",
        url: "assets/img/new-document/preset-social-black.svg",
      },
      {
        revision: "bd288ea2e6c586c2396210dd5c5ae31c_8795",
        url: "assets/img/new-document/preset-social-white.svg",
      },
      {
        revision: "297640c153ebe70a4b05d742b0fec0d0_8795",
        url: "assets/img/new-document/preset-tablet-black.svg",
      },
      {
        revision: "82ba439a491f2f88e7d449541980e126_8795",
        url: "assets/img/new-document/preset-tablet-white.svg",
      },
      {
        revision: "a17d1283e93798f9441d67035d7b60a4_8795",
        url: "assets/img/new-document/preset-templates-black.svg",
      },
      {
        revision: "dffc91a08152fc3b832c2186875263a0_8795",
        url: "assets/img/new-document/preset-templates-white.svg",
      },
      {
        revision: "5826c83c2987f3665dcd137ebda884bb_8795",
        url: "assets/img/new-document/preset-web-black.svg",
      },
      {
        revision: "f125683c3552f718e2f32e8c46b7b685_8795",
        url: "assets/img/new-document/preset-web-white.svg",
      },
      {
        revision: "d1aa96f3a857f3f7e3574bcdc5270726_8795",
        url: "assets/img/news/header3.3.0.png",
      },
      {
        revision: "176925e04f31eb6569160c57423cf0d0_8795",
        url: "assets/prerendered/icon128.png",
      },
      {
        revision: "e991931fc997d7296b2e9feb8db75eb3_8795",
        url: "assets/prerendered/icon16.png",
      },
      {
        revision: "f0541543c31ca6dbf0d334e4aae98368_8795",
        url: "assets/prerendered/icon256.png",
      },
      {
        revision: "54f23f51236cc3f87c5f92caedf179a8_8795",
        url: "assets/prerendered/icon32.png",
      },
      {
        revision: "29f63fac4ec7e416edcaf5f5e5a729b6_8795",
        url: "assets/prerendered/icon48.png",
      },
      {
        revision: "853bb73ddfea81c7c121dc03c529185c_8795",
        url: "assets/prerendered/icon512.png",
      },
      {
        revision: "04e3d8a9cd90b5824cee9cbaddf9f9b8_8795",
        url: "assets/static/maintenance/index.html",
      },
      {
        revision: "d2a92928bcfed646e387a6690f92979e_8795",
        url: "assets/static/maintenance/logo.svg",
      },
      {
        revision: "5e8a53dc5cc5fe70b07b667bc415df5f_8795",
        url: "autosave.worker.js",
      },
      {
        revision: "7cb88ae15681e925b9825a7c19295eaf_8795",
        url: "chunk.vendor.js",
      },
      {
        revision: "7341cf1185659c5b6b460d33e7a12dde_8795",
        url: "chunk.vendors~heic2any.js",
      },
      {
        revision: "6de6a207c3433ddd1c022e57a4ee724b_8795",
        url: "chunk.vendors~pdfjsWorker.js",
      },
      {
        revision: "7a1bcf750f1e20a28f0d64980a65a8a0_8795",
        url: "designer.browser.dark.css",
      },
      {
        revision: "baf096a18f3169da2e2c91bd59a3474f_8795",
        url: "designer.browser.js",
      },
      {
        revision: "dff101132147349edd900a10cd3b972d_8795",
        url: "designer.browser.light.css",
      },
      { revision: "641dd14370106e992d352166f5a07e99_8795", url: "jquery.js" },
      {
        revision: "78a43883339729b01a5168ee05224d72_8795",
        url: "pdf.worker.js",
      },
      {
        revision: "866e0e1292827a899d7ad644f5867f2d_8795",
        url: "pdfexport.worker.js",
      },
      {
        revision: "7fb3defaae46efc2ab80aa5768e17d2a_8795",
        url: "ps.worker.js",
      },
      {
        revision: "60095c8207afd157c48831c46fb66615_8795",
        url: "psclasses.js",
      },
      { revision: "c1428dd0a04f9e77ddb7248844c0037e_8795", url: "pscolor.js" },
      { revision: "3ee18f2ac7df8c0471f527a27aab7b76_8795", url: "pscore.js" },
      { revision: "ae0b6c0aac78197908fcf59476935421_8795", url: "psctm.js" },
      { revision: "4e7b5699ffc4781c0c27b97ade3c9a5d_8795", url: "psparser.js" },
      { revision: "ddaeae9a2a993b8653ba900176a127a2_8795", url: "static.css" },
      {
        revision: "b4078b49bbab13cd034125cf7a9d03b9_8795",
        url: "static.maintenance.js",
      },
      { revision: "d81e8fe30de861acb21a782321f14fe1_8795", url: "index.html" },
      {
        revision: "e29764b039e88805ad3a4fcf5590e36d_8795",
        url: "manifest.json",
      },
      { revision: "7d1a58a18fe9f6a49e0438a4fe5bdbdb_8795", url: "proxy.html" },
      {
        revision: "29d91793715bb3d1d7916f1b4a346ba0_8795",
        url: ".well-known/assetlinks.json",
      },
    ],
    {
      // Ignore all URL parameters.
      ignoreURLParametersMatching: [/.*/],
    },
  );
} else {
  console.warn("No workbox");
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});
