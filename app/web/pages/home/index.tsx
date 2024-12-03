import * as React from 'react';

import doraemon from './duraemon.svg';
import './style.scss';
const Home = () => {
    return (
        <div className="page-home">
            <div className="welcome">
                <img className="doraemon" src={doraemon} />
                <div className="text"> Welcome to Doraemon~</div>
            </div>
        </div>
    );
};
export default Home;
