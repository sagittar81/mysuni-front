import React from 'react';
import WaveSurfer from 'wavesurfer.js'

const proxyUrl: string = 'https://proxy-panopto.api.mysuni.sk.com';
const userkey: string = 'gateway';
const userpwd: string = 'pass_1234';
const progressChkTime: number = 10;
const rew_fwd_time: number = 10;
const mySuniServerDomain: string = 'http://localhost:8080';
let audioSrc: string = '';
let wavesurfer: WaveSurfer;
let progressCheck: boolean = true;

const testMp4 = require('./example/test.mp4');

interface IProps {
    panoptoId: string;
    userId: string;
}

const divStyle = {
    width: 720
}

class Confirm extends React.PureComponent<IProps> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            isLoaded: false,
        };
    }

    /**
     * playerInit
     * wavesurfer player 를 생성한다
     */
    public playerInit() {
        let panoptoApiUrl = proxyUrl + '/pt/schedule_list?currentPage=1&page_size=300&sessionState=110000&sort=Name&sortIncreasing=Asc&userkey='
            + userkey + '&userpwd=' + userpwd + '&searchQuery=' + this.props.panoptoId;

        let _this = this;

        fetch(panoptoApiUrl)
            .then(res => res.json())
            .then(
                (result) => {
                    audioSrc = result.sessions[0].mp3Url;

                    this.setState({
                        isLoaded: true
                    });

                    wavesurfer = WaveSurfer.create({
                        container: '#waveform',
                        scrollParent: true,
                        waveColor: 'violet',
                        progressColor: 'purple',
                        partialRender: true,
                        xhr: {}
                    })

                    wavesurfer.load(testMp4);
                    wavesurfer.on('ready', function () {
                        _this.setSeekingTime();
                    });

                    wavesurfer.on('audioprocess', function(){
                        const mySuniApiUrl = mySuniServerDomain + "/setProgressTime";
                        let currentTime: number = Number(wavesurfer.getCurrentTime().toFixed());

                        if (currentTime > 0 && currentTime % progressChkTime === 0) {
                            if(progressCheck) {
                                var _data = {
                                    panoptoId: _this.props.panoptoId,
                                    userId: _this.props.userId,
                                    currentTime: currentTime,
                                    type: 'audio'
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

                                progressCheck = false;
                            }
                        } else {
                            progressCheck = true;
                        }
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
                    wavesurfer.skipForward(result.seeking_time);
                },
                (error) => {
                    console.log(error)
                }
            )
    }

    public componentDidMount() {
        this.playerInit();
    }

    public render() {
        const {panoptoId} = this.props;
        return (
            <div>
                <p>PanoptoId : {panoptoId}</p>
                <audio controls src={testMp4}>
                    Your browser does not support the <code>audio</code> element.
                </audio>
                <br/>
                <div id="waveform" style={divStyle}>
                </div>
                <button onClick={wavesurferPlayRew}>REW</button>
                <button onClick={wavesurferPlayBtn}>play/stop</button>
                <button onClick={wavesurferPlayFwd}>FWD</button>
            </div>
        );
    }
}

function wavesurferPlayBtn() {
    wavesurfer.playPause();
}

function wavesurferPlayRew() {
    wavesurfer.skipBackward(rew_fwd_time);
}

function wavesurferPlayFwd() {
    wavesurfer.skipForward(rew_fwd_time);
}

export default Confirm;