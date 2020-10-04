    import React from 'react';
    import Plyr from 'plyr'
    import Hls from 'hls.js'
    import videojs from 'video.js'
    import './plyr/plyr.css'

    const proxyUrl: string = 'https://proxy-panopto.api.mysuni.sk.com';
    const userkey: string = 'gateway';
    const userpwd: string = 'pass_1234';
    const progressChkTime: number = 10;
    const clientAPIKey: string = "5c741524-8a27-4658-a4b4-ac3e0077651a";
    const clientSecretValue: string = "H5lZCkG4Ke6dNsA6F182QHerQQwmbLwF+pAVoEsO/kw=";
    const skPanoptoDomain: string = 'sku.ap.panopto.com';
    const domain: string = 'http://sagittar.com:3000';
    const mySuniServerDomain: string = 'http://localhost:8080';
    let videoSrc: string = '';
    let m3u8Src: string = '';
    let videoType: string = '';
    let player: Plyr;
    let hls: Hls;
    let videoTag: HTMLMediaElement;

    //https://sku.ap.panopto.com//Panopto/oauth2/connect/authorize?client_id=5c741524-8a27-4658-a4b4-ac3e0077651a&scope=api&redirect_uri=http://sagittar.com:3000&response_type=token&nonce=


    const divStyle = {
        width: 720,
        heiht: 360
    }

    interface IProps {
        panoptoId: string;
        userId: string;
    }

    class Confirm extends React.PureComponent<IProps> {
        private skuVideoPlayer: React.RefObject<HTMLVideoElement>;

        constructor(props: IProps) {
            super(props);
            this.state = {
                isLoaded: false,
                isProgressSend: false
            };
            this.skuVideoPlayer = React.createRef();
        }

        /**
         * Panopto 의 Video 정보를 불러온다
         */
        public getPanoptoVideoInfos() {
            //const panoptoApiUrl = proxyUrl + '/pt/schedule_list?currentPage=1&page_size=300&sessionState=110000&sort=Name&sortIncreasing=Asc&userkey='
            //    + userkey + '&userpwd=' + userpwd + '&searchQuery=' + this.props.panoptoId;

            const panoptoApiUrl = proxyUrl + '/pt/schedule_view?id=' + this.props.panoptoId + '&userkey=' + userkey + '&userpwd=' + userpwd

            fetch(panoptoApiUrl)
                .then(res => res.json())
                .then(
                    (result) => {
                        //get panopto api infos
                        videoSrc = result.session[0].mp4Url;
                        m3u8Src = result.session[0].iosVideoUrl;
                        videoType = "video/mp4";
                        
                        //set m3u8 links
                        //if(m3u8Src !== '') {
                        //    videoSrc = m3u8Src;
                        //    videoType = "application/x-mpegURL";
                        //} 

                        this.getMysuniInfos();

                        this.setState({
                            isLoaded: true
                        });
                    },
                    (error) => {
                        this.setState({
                            isLoaded: true
                        });
                    }
                )
        }

        /**
         * 
         */
        public getMysuniInfos() {
            this.playerInit();
            this.setSeekingTime();
            this.sendProgressTime();
            this.getCaptionInfos();
        }

        /**
         * setSeekingTime
         * 서버에서 진행율을 가져온다
         * sample server 상에서는 seeking_time 이라는 key 로 가져오지만, 운영 환경상 다른 값으로 한다면 수정 필요
         */
        public setSeekingTime() {
            const mySuniApiUrl = mySuniServerDomain + "/getPanoptoSeeking"
            let _data = {
                panoptoId: this.props.panoptoId,
                userId: this.props.userId
            }

            fetch(mySuniApiUrl, {
                method : 'post',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(_data)
            })
                .then(res => res.json())
                .then(
                    (result) => {
                        player.on('canplay', event => {
                            if(player.currentTime === 0 && result.seeking_time > 0) player.currentTime = result.seeking_time;
                        });
                    },
                    (error) => {
                        console.log(error)
                    }
                )
        }

        /**
         * sendProgressTime
         * 진행율(시간)을 업데이트 한다
         */
        public sendProgressTime() {
            let _this = this;

            //timeupdate event
            player.on('timeupdate', function (event) {
                let instance = event.detail.plyr;
                let currentTime: number = Number(instance.currentTime.toFixed());
                const mySuniApiUrl = mySuniServerDomain + "/setProgressTime"

                if (currentTime > 0 && currentTime % progressChkTime === 0) {
                    //TODO send progress
                    var _data = {
                        panoptoId: _this.props.panoptoId,
                        userId: _this.props.userId,
                        currentTime: currentTime,
                        type: 'video'
                    }

                    fetch(mySuniApiUrl, {
                        method : 'post',
                        mode: 'cors',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(_data)
                    })
                        .then(res => res.json())
                        .then(
                            (result) => {
                                console.log(result)
                            },
                            (error) => {
                                console.log(error)
                            }
                        )
                }
            });
        }

        /**
         * playerInit
         * 플레이어를 생성 및 m3u8 파일에 대하여 hls 설정을 한다
         */
        public playerInit() {
            this.skuVideoPlayer.current?.load();
            player = new Plyr('#skuvideoplayer');

            let accessTokenValue;
            if (window.location.href.indexOf('#') > 0) {
                var url = window.location.href;
                accessTokenValue = url.split('#')[1].split('&')[0].split('=')[1];
            }

            player.on('ready', function (event) {
                var hslSource = null;
                var sources = document.querySelectorAll('source'), i;

                for (i = 0; i < sources.length; ++i) {
                    if (sources[i].src.indexOf('.m3u8') > -1) {
                        hslSource = sources[i].src;
                    }
                }
                
                if (hslSource !== null && Hls.isSupported()) {
                    var hlsConfig = {
                        debug: true,
                        xhrSetup: function (xhr, videoSrc) {
                            xhr.withCredentials = true; // do send cookie
                            xhr.setRequestHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
                            xhr.setRequestHeader("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
                            xhr.setRequestHeader("Access-Control-Allow-Origin", "http://sagittar.com:3000");
                            xhr.setRequestHeader("Access-Control-Allow-Credentials", "true");
                            xhr.setRequestHeader("ClientAPIKey", clientAPIKey);
                            xhr.setRequestHeader("ClientSecretValue", clientSecretValue);
                            xhr.setRequestHeader("AccessTokenValue", accessTokenValue);
                        }
                    };

                    hls = new Hls(hlsConfig);
                    videoTag = document.getElementById('skuvideoplayer') as HTMLMediaElement;

                    hls.loadSource(hslSource);
                    hls.attachMedia(videoTag);
                    hls.on(Hls.Events.MANIFEST_PARSED, function () {
                        //cors issues - 
                        console.log('MANIFEST_PARSED');
                    });
                }
            });
        }

        public getCaptionInfos() {

        }

        public componentDidMount() {
            this.getPanoptoVideoInfos();
        }

        public render() {
            const {panoptoId} = this.props;
            return (
                <div style={divStyle}>
                    <p>PanoptoId : {panoptoId}</p>
                    <video ref={this.skuVideoPlayer} id='skuvideoplayer' playsInline controls>
                        <source
                            src={videoSrc}
                            type={videoType}
                        />
                        {/* track 으로 캡션기능을 넣는다 */}
                        {/* <track kind="captions" label="English captions" src="/path/to/captions.vtt" srclang="en" default /> */}
                    </video>
                </div>
            );
        }
    }

    export default Confirm;