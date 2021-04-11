import React from "react";
import "../itemCard/itemCard.css";


const ItemCard = props => {
  return (
    <div className="col-sm-3">
      <div className="card  bg-white">
        <img
          className="card-img-tag center "
          src={
            props.item.poster_path
              ? `https://image.tmdb.org/t/p/w500/${props.item.poster_path}`
              : "https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou6r8FAZt7PLafCR9_9S_moW0m_7zO6-fwzIEupV107uTpImg0FawqEU-ZWD3Io-RcVVtMFjY-FLsxurphZO8tYOJlyVoD4RI0Q"
          }
        />
        <div className="card-body">
          <h4 className="card-title ">{props.item.name}</h4>
        </div>
        <div className="card-footer">
          <button type="button" className="btn w-100 btn-primary">
            Add to Favorites
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard ;