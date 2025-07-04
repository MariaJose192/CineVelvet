import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Config } from '../api/Config';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import HeaderConTabs from '../components/HeaderConTabs';
import { FiPlay, FiX } from 'react-icons/fi';
import Modal from 'react-modal';
import '../css/Home.css';
import '../css/Sesiones.css';

const Home = () => {

    //Constantes utilizadas
    const navigate = useNavigate();
    const [peliculas, setPeliculas] = useState([]);
    const [sesionesPorPelicula, setSesionesPorPelicula] = useState({});
    const [modalAbierto, setModalAbierto] = useState(false);
    const [peliculaSeleccionada, setPeliculaSeleccionada] = useState(null);
    const [indicePeliculas, setIndicePeliculas] = useState(4);
    const [cargando, setCargando] = useState(false);
    const [mostrandoLoader, setMostrandoLoader] = useState(false);
    const platform = Capacitor.getPlatform();
    const mostrarBotonAdmin = platform !== 'ios' && platform !== 'android';

    useEffect(() => {
        Modal.setAppElement('#root');
        fetchPeliculas();
    }, []);

    useEffect(() => {
        peliculas.forEach(pelicula => {
            fetchSesionesPorPelicula(pelicula.id);
        });
    }, [peliculas]);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const windowHeight = window.innerHeight;
            const fullHeight = document.documentElement.scrollHeight;

            if (scrollTop + windowHeight >= fullHeight - 100 && !cargando && indicePeliculas < peliculas.length) {
                cargarMasPeliculas();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [cargando, indicePeliculas, peliculas.length]);

    //Método para buscar la lista de peliculas
    const fetchPeliculas = async () => {
        setMostrandoLoader(true);
        try {
            const response = await axios.get(`${Config.urlBackend}/peliculas/publicadas`);
            setPeliculas(response.data);
        } catch (error) {
            console.error("Error al cargar las películas:", error);
        } finally {
            setTimeout(() => {
                setMostrandoLoader(false);
            }, 1500);
        }
    };

    //Método para cargar las peliculas de la programación cuando deslizas hacia abajo
    const cargarMasPeliculas = () => {
        setCargando(true);
        setTimeout(() => {
            setIndicePeliculas(prev => prev + 4);
            setCargando(false);
        }, 1000);
    };

    //Método para cargar las sesiones disponibles para cada pelicula según su ID
    const fetchSesionesPorPelicula = async (peliculaId) => {
        try {
            const response = await axios.get(`${Config.urlBackend}/sesiones/pelicula/${peliculaId}/futuras`);
            setSesionesPorPelicula(prev => ({
                ...prev,
                [peliculaId]: response.data
            }));
        } catch (error) {
            console.error(`Error al cargar las sesiones para la película ${peliculaId}:`, error);
        }
    };

    //Métodos para abrir o cerrar los modales
    const abrirModal = (pelicula) => {
        setPeliculaSeleccionada(pelicula);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setPeliculaSeleccionada(null);
        setModalAbierto(false);
    };


    //Método para transformar una URL de youtube para insertarlo en el iframe
    const transformarEnlaceEmbed = (url) => {
        if (!url) return null;
        const videoIdMatch = url.match(/(?:\?v=|\.be\/)([^&]+)/);
        if (videoIdMatch && videoIdMatch[1]) {
            return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
        }
        return url;
    };

    return (
        <div className="home-container">
            <HeaderConTabs />

            {mostrandoLoader ? (
                <div>
                    <div className="loader"></div>
                </div>
            ) : (
                <>
                    <div className="peliculas-list">
                        {peliculas.slice(0, indicePeliculas).map((pelicula) => (
                            <div key={pelicula.id} className="pelicula-card">
                                <div className="portada-container" onClick={() => abrirModal(pelicula)}>
                                    <img src={`data:image/jpeg;base64,${pelicula.portada}`} alt={pelicula.titulo} />
                                    <div className="play-icon-overlay">
                                        <FiPlay size={36} />
                                    </div>
                                </div>

                                <div className="pelicula-info">
                                    <h2>{pelicula.titulo}</h2>
                                    <p>{pelicula.descripcion}</p>
                                    <p>{pelicula.duracion} min | {pelicula.genero} | {pelicula.edades}</p>

                                    <div className="sesiones">
                                        {sesionesPorPelicula[pelicula.id] ? (
                                            sesionesPorPelicula[pelicula.id].length > 0 ? (
                                                Object.entries(
                                                    sesionesPorPelicula[pelicula.id].reduce((acc, sesion) => {
                                                        if (!acc[sesion.strFecha]) acc[sesion.strFecha] = [];
                                                        acc[sesion.strFecha].push(sesion);
                                                        return acc;
                                                    }, {})
                                                ).map(([strFecha, sesiones], index) => (
                                                    <div key={index} className="sesion-item">
                                                        <span className="sesion-fecha">{strFecha}</span>
                                                        <div className="sesion-horas">
                                                            {sesiones.map((sesion, sesiones) => (
                                                                <button key={sesiones} onClick={() => navigate(`/salas/${sesion.salaId}/sesion/${sesion.id}`)}>
                                                                    {sesion.strHora}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p>No hay sesiones disponibles</p>
                                            )
                                        ) : (
                                            <p>Cargando sesiones...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {cargando && (
                            <div className="loader spinner"></div>
                        )}
                    </div>

                    <Modal
                        isOpen={modalAbierto}
                        onRequestClose={cerrarModal}
                        contentLabel="Descripción de la película"
                        className="popup-portada-modal"
                        overlayClassName="custom-overlay"
                        ariaHideApp={false}>
                        {peliculaSeleccionada && (
                            <div>
                                <h2>{peliculaSeleccionada.titulo}</h2>
                                {peliculaSeleccionada.trailer ? (
                                    <iframe
                                        width="100%"
                                        height="400"
                                        src={transformarEnlaceEmbed(peliculaSeleccionada.trailer)}
                                        title="Tráiler"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <p className="aviso-trailer">Esta película no tiene tráiler disponible.</p>
                                )}

                                <button className="cerrar-icono" onClick={cerrarModal}>
                                    <FiX size={24} />
                                </button>
                            </div>
                        )}
                    </Modal>

                    <footer className="contacto-footer">
                        <h5>Contacto</h5>
                        <p>¿Tienes alguna duda o sugerencia? Escríbenos a: <a href="mailto:cinemavelvet2025@gmail.com">cinemavelvet2025@gmail.com</a></p>
                    </footer>
                </>
            )}
        </div>
    );
};

export default Home;
