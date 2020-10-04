import React, {useCallback} from 'react';
import SkuVideoPlayer from './components/SkuPlayer/SkuVideoPlayer'
import SkuAudioPlayer from './components/SkuPlayer/SkuAudioPlayer'

const cors = require('cors');

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <SkuVideoPlayer panoptoId="a47d2394-c457-44a4-8380-ac0000a1302a" userId="dj.baek@sk.com"></SkuVideoPlayer>
                <br/>
                <SkuAudioPlayer panoptoId="9af64bcf-e48a-47be-8bad-ab6c018b1396" userId="dj.baek@sk.com"></SkuAudioPlayer>
            </header>
        </div>
    );
}

export default App;
