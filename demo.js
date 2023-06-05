/*
 *rendering_bg.wasm，rendering.js，thread_bg.wasm，thread.js四个依赖文件需要和html文件在同级目录
*/
import { dbscan } from './assets/dbscanjs.js'; //聚类算法
import { mockdata1 } from './mock/644214.js';
import { mockdata2 } from './mock/449174.js';
const urlParams = new URLSearchParams(window.location.search);
const mapid = urlParams.get('mapid') ? urlParams.get('mapid') : '644214';
let hmap;
let Amap;
let Cmap;
window.cmapload = (map) => {
    //cmapload必须写在centmap.js加载完成之前，sdk加载是异步的，注意代码执行顺序；
    Cmap = map.init("map_container", {
        baseMap: "null", // 'AMap'; 是否开启高德底图，必须先引入高德地图SDK文件 “amap.js”
        mapSource: `https://tst-data.centmap.com:8443/mapres/${mapid}`, // 地图数据地址
        defaultControl: true, // 默认控件
        mockNavigation: true, // 是否开启模拟导航
        angle: 0, // [0, 360]; 地图旋转角度
        zoom: 0.62, // 地图初始缩放级别
        pitch: 0, // [0, 60]; 地图俯仰角度
        zooms: [0.05, 10], // [0.04, 11]; 地图缩放范围
        stdZoom: 0.05,
        banActions: ['pitch'],
        // rotateEnable: false,
    });

    var layer = new AMap.TileLayer({
        zooms: [15.745, 20],
        visible: false,
        opacity: 0,
        zIndex: 2,
        animateEnable: false,
        rotateEnable: false,
        pitch: 0,
    })

    // 监听地图 POI 点选事件
    var startPoint = [];//[0,0,0]
    var endPoint = [];//[0,0,0]
    var startRdFl;
    var endRdFl;
    var currRdFl;

    Cmap.on('complete', ({ info: { center } }) => {
        let Hcenter = Cmap.cmapCoordToGCJ02(...center);
        currRdFl = Cmap.getVisibleFloorInfo()?.[1][1];
        Amap = new AMap.Map("map_container", {
            resizeEnable: true,
            viewMode: '2D',
            zoom: 19.6971115552543,
            center: Hcenter,
            animateEnable: false,
            rotateEnable: false,
            pitch: 0,
            angle: 0,
            rotation: 0,
            zooms: [16.064890922499053, 23.660376519531717],
            layers: [layer],
        })

        Amap.plugin(["AMap.HeatMap"], function () {
            hmap = new AMap.HeatMap(Amap, {
                radius: 10,
                opacity: [0, 0.8],
                zooms: [3, 23.79700991611249],
                zoom: 18.052234851651782,
                rotation: 0,
            });
            let data = getMockData(mapid, currRdFl);
            updateHeatmap(data);
        })
    })

    Cmap.on('click', ({ info }) => {
        console.log(info);
        if (!startPoint.toString()) {
            startPoint = info.center ? info.center : info.lnglat;
            startRdFl = info.rdFl
        } else {
            endPoint = info.center ? info.center : info.lnglat;
            endRdFl = info.rdFl
        }
        if (startPoint.toString() && endPoint.toString() && startPoint.toString() !== endPoint.toString()) {
            Cmap.routeManager.route(startPoint[0], startPoint[1], startRdFl, endPoint[0], endPoint[1], endRdFl, 1, [0]).then(res => {
                Cmap.routeManager.drawPath([startRdFl, endRdFl])
                //获取模拟导航的拆分点
                const points = Cmap.routeManager.naviSimulate();
                let data = getMockData(mapid, currRdFl, points);
                updateHeatmap(data);

            })
        }
    });


    Cmap.on('switchFloor', ({ info }) => {
        currRdFl = info.rdFl;
        let data = getMockData(mapid, currRdFl);
        updateHeatmap(data);
    });

    Cmap.on('zoom', ({ info }) => {
        let newzoom = Cmap.cmapZoom2amapZoom(info)
        Amap.setZoom(newzoom)
    })

    Cmap.on('move', ({ info }) => {
        let center = Cmap.getCenter()
        let newcenter = Cmap.cmapCoordToGCJ02(...center)
        Amap.setCenter([...newcenter])
    })

    Cmap.on('rotate', ({ info }) => {
        let pi = 3.1415926535897932
        let Crotate = (info) * 180 / pi
        Amap.setRotation(Crotate)
    })
};

function updateHeatmap(data) {
    let data_ = data?.map(item => {
        // 使用聚类算法筛选点并转换成热力图数据（gcj02）
        return { 'lng': Cmap.cmapCoordToGCJ02(item.lng, item.lat)[0], 'lat': Cmap.cmapCoordToGCJ02(item.lng, item.lat)[1], count: item.count }
    })
    // console.log(data_);
    if (data_) {
        hmap.setDataSet({
            data: data_
        });
    }
}

function getMockData(mapid, rdfl, data) {
    let data_ = [];
    switch (mapid) {
        case '449174':
            if (data) {
                data_ = data?.filter(item => {
                    return item[2] === rdfl;
                })
            } else {
                mockdata2?.forEach(item => {
                    if (item.rdFl === rdfl) {
                        data_.unshift(item.location)
                    }
                })
            }
            if (!data_.toString()) break;
            return getHeamapData(data_);
        case '644214':
            if (data) {
                data_ = data?.filter(item => {
                    return item[2] === rdfl;
                })
            } else {
                mockdata1?.forEach(item => {
                    if (item.rdFl === rdfl) {
                        data_.unshift(item.location)
                    }
                })

            }
            if (!data_.toString()) break;
            return getHeamapData(data_);
        default:
            return [];
    }
}

function distance(a, b) {
    let x = Math.pow(a[0] - b[0], 2);
    let y = Math.pow(a[1] - b[1], 2);
    if (x && y) return Math.sqrt(x + y);
}

function getHeamapData(data) {
    let clusterOutput = dbscan(data, distance, 0.1, 1);
    const m = new Map();
    const resData = [];
    clusterOutput.forEach(item => {
        if (m[item]) {
            m[item]++;
        } else {
            m[item] = 1;
        }
    })
    Object.keys(m).forEach(key => {
        if (key !== '-1') {
            resData.push({ 'lng': data[key][0], 'lat': data[key][1], 'count': m[key] });
        }
    })
    return resData;
}


