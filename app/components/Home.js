// @flow
import React, { Component } from 'react';
import Modal from 'react-modal';

import styles from './Home.css';
import dummyData from '../utils/dummyData';
import logo from '../logo.svg';

const { exec } = require('child_process');
const Store = require('electron-store');
const shortid = require('shortid');

const store = new Store({ name: 'spotify-looper' });

type Props = {};

const prefixCmd = `osascript -e 'tell application "Spotify"`;
const cmd = {
  play: `${prefixCmd} to play track "<TRACK_ID>"'`,
  setStartPos: `${prefixCmd} to set player position to <POS>'`,
  getTrackName: `${prefixCmd} to get name of current track'`,
  getArtistName: `${prefixCmd} to get artist of current track'`
};

const customStyles = {
  overlay: {
    backgroundColor: '#121212'
  },
  content: {
    width: '80%',
    top: '40%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-20%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#121212',
    border: '0px'
  },
  title: {
    color: 'white'
  }
};

Modal.setAppElement('#root');

export default class Home extends Component<Props> {
  props: Props;

  constructor() {
    super();

    let songs = store.get('songs');
    console.log(songs);
    if (!songs) {
      songs = dummyData;
    }

    this.state = {
      songs,
      modalIsOpen: false,
      formEndPos: 10,
      formStartPos: 5,
      formTag: 'testadd',
      formTrackId: 'spotify:track:3A5o0lL7xAvKd1loW3uIID',
      formArtist: '_',
      formName: '_'
    };

    this.openModalForAdd = this.openModalForAdd.bind(this);
    this.closeModal = this.closeModal.bind(this);

    this.addLoop = this.addLoop.bind(this);
    this.saveLoop = this.saveLoop.bind(this);
    this.deleteLoop = this.deleteLoop.bind(this);

    this.handleInputChange = this.handleInputChange.bind(this);
  }

  openModalForAdd() {
    this.setState({
      isEditing: false,
      modalIsOpen: true,
      formTrackId: '',
      formStartPos: 0,
      formEndPos: 0,
      formTag: ''
    });
  }

  closeModal() {
    this.setState({ modalIsOpen: false });
  }

  getTrackFromModalForm() {
    const {
      formTrackId,
      formStartPos,
      formEndPos,
      formTag,
      formArtist,
      formName
    } = this.state;

    return {
      trackId: formTrackId,
      start: formStartPos,
      end: formEndPos,
      tag: formTag,
      artist: formArtist,
      name: formName
    };
  }

  addLoop() {
    const song = this.getTrackFromModalForm();
    song.artist = '_';
    song.name = '_';

    let { songs } = this.state;
    songs = [...songs, song];

    store.set('songs', songs);

    this.setState({
      modalIsOpen: false,
      songs
    });
  }

  deleteLoop() {
    const { editingSong } = this.state;
    let { songs } = this.state;
    songs = songs.slice();

    songs.splice(editingSong.idx, 1);

    store.set('songs', songs);
    this.setState({ songs, modalIsOpen: false });
  }

  saveLoop() {
    const { editingSong } = this.state;

    let { songs } = this.state;
    songs = songs.slice();
    songs[editingSong.idx] = this.getTrackFromModalForm();

    store.set('songs', songs);
    this.setState({ songs, modalIsOpen: false });
  }

  handleInputChange(event) {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState({
      [name]: value
    });
  }

  playSong(song) {
    const playCmd = cmd.play.replace(/<TRACK_ID>/, song.trackId);
    exec(playCmd, error => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }

      const setPos = cmd.setStartPos.replace(/<POS>/, song.start);
      exec(setPos, () => {
        if (song.name === '_' && song.artist === '_') {
          exec(cmd.getArtistName, (e1, stdout1) => {
            exec(cmd.getTrackName, (e2, stdout2) => {
              const artistName = stdout1.trim();
              const trackName = stdout2.trim();

              console.log(artistName, trackName);

              let { songs } = this.state;
              songs = songs.slice();
              songs[song.idx].name = trackName;
              songs[song.idx].artist = artistName;

              store.set('songs', songs);
              this.setState({ songs });
            });
          });
        }
      });
    });
  }

  editSong(song) {
    this.setState({
      modalIsOpen: true,
      isEditing: true,
      formEndPos: song.end,
      formStartPos: song.start,
      formTrackId: song.trackId,
      formTag: song.tag,
      formArtist: song.artist,
      formName: song.name,
      editingSong: song
    });
  }

  handleClick(song, event) {
    console.log(event);
    if (event.shiftKey) {
      this.editSong(song);
      return;
    }

    if (this.looper) {
      console.log('clear loop');
      console.log(this.looper);
      clearInterval(this.looper);
    }

    const interval = (song.end - song.start) * 1000;
    this.playSong(song);
    this.looper = setInterval(() => {
      this.playSong(song);
    }, interval);
  }

  render() {
    const { songs, modalIsOpen, isEditing, editingSong } = this.state;
    const { formTrackId, formStartPos, formEndPos, formTag } = this.state;

    const songListStr = songs.map((ss, index) => {
      const s = ss;
      s.idx = index;
      return (
        <li className={styles.song} key={shortid.generate()}>
          <div
            onClick={this.handleClick.bind(this, s)}
            role="button"
            onKeyDown={() => {}}
            tabIndex={-index - 1}
          >
            <div className={styles.song_title}>{s.name}</div>
            by <b>{s.artist}</b>
            <div className={styles.song_tag}>#{s.tag}</div>
            <div className={styles.song_time}>
              from {s.start}s to {s.end}s
            </div>
          </div>
        </li>
      );
    });
    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.logoContainer}>
          <img className={styles.logo} src={logo} alt="logo" />
        </div>
        <h3>
          {songs.length} loops in collection
          <span
            className={styles.mainAddButton}
            tabIndex="0"
            onClick={this.openModalForAdd}
            onKeyDown={() => {}}
            role="button"
          >
            +
          </span>
        </h3>

        <Modal
          isOpen={modalIsOpen}
          onRequestClose={this.closeModal}
          style={customStyles}
          contentLabel="Example Modal"
        >
          <h2 className={styles.modalTitle}>
            {isEditing && (
              <span>
                Editing{' '}
                <span className={styles.editingTitle}>
                  {editingSong.name} - {editingSong.artist}
                </span>
              </span>
            )}
            {!isEditing && <span>New loop</span>}
          </h2>
          <div className={styles.input_form}>
            <div>
              <span className={styles.input_track_label}>
                Spotify URI <i>e.g. spotify:track:3vn5yPCTcGpq5MVZo8hTtc</i>
              </span>
              <input
                type="text"
                name="formTrackId"
                value={formTrackId}
                onChange={this.handleInputChange}
                disabled={isEditing}
              />
            </div>
            <div>
              <span className={styles.input_track_label}>
                Start Position <i>e.g. 10</i>
              </span>
              <input
                name="formStartPos"
                type="text"
                onChange={this.handleInputChange}
                value={formStartPos}
              />
              <span className={styles.input_track_label}>
                End Position <i>e.g. 30</i>
              </span>
              <input
                name="formEndPos"
                type="text"
                onChange={this.handleInputChange}
                value={formEndPos}
              />
            </div>
            <div>
              <span className={styles.input_track_label}>
                Hashtag <i>e.g. for reminder :)</i>
              </span>
              <input
                name="formTag"
                type="text"
                onChange={this.handleInputChange}
                value={formTag}
              />
            </div>
          </div>
          <div className={styles.modalButtons}>
            {isEditing && (
              <div>
                <span
                  className={styles.modalButton}
                  onClick={this.saveLoop}
                  onKeyDown={() => {}}
                  role="button"
                  tabIndex="-1"
                >
                  Save
                </span>
                <span
                  className={styles.modalButton}
                  onClick={this.deleteLoop}
                  onKeyDown={() => {}}
                  role="button"
                  tabIndex="-2"
                >
                  Delete
                </span>
              </div>
            )}
            {!isEditing && (
              <div>
                <span
                  className={styles.modalButton}
                  onClick={this.addLoop}
                  onKeyDown={() => {}}
                  role="button"
                  tabIndex="-3"
                >
                  Add
                </span>
              </div>
            )}
            <span
              className={styles.modalButton}
              onClick={this.closeModal}
              onKeyDown={() => {}}
              role="button"
              tabIndex="-4"
            >
              Cancel
            </span>
            <div className={styles.clear} />
          </div>
          {!isEditing && (
            <div className={styles.modalTip}>
              <b>Tip</b> You can always edit existing loops by Shift + Click!
            </div>
          )}
        </Modal>

        <ul className={styles.songList}>{songListStr}</ul>
        {/* <div className={styles.footer}>
            <i className="fas fa-code"></i> by @heytitle 
        </div> */}
      </div>
    );
  }
}
