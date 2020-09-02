import React from 'react';
import './style.scss';
import doraemon from './duraemon.svg';
const Home = ()=>{
  return (<div className="page-home">
      <div className="welcome">
        <img className="doraemon" src={doraemon}/>
        <div className="text"> Welcome to Doraemon~</div>
      </div>
  </div>);
}
export default Home;
