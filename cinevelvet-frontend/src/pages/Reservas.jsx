import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/Sala.css';
import '../css/Home.css';
import { Config } from '../api/Config';
import HeaderTabs from '../components/HeaderTabs';
import logoCinema from '../assets/logoCine.jpg';
import { FiArrowLeftCircle } from "react-icons/fi";
import { FiClock } from 'react-icons/fi';

const Reservas = () => {
  //Constantes utilizadas
  const location = useLocation();
  const { sesionId, butacasSeleccionadas } = location.state || {};
  const [butacasSeleccionadasState] = useState(butacasSeleccionadas || []);
  const [sesion, setSesiones] = useState([]);
  const [butacas, setButacas] = useState([]);
  const [cliente, setCliente] = useState({ nombre: '', email: '', telefono: '' });
  const [mensajeGuardado, setMensajeGuardado] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [contador, setContador] = useState(null);
  const [comprando, setComprando] = useState(false);
  const [mostrandoLoader, setMostrandoLoader] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(240);
  const [mostrarPopupTiempo, setMostrarPopupTiempo] = useState(false);
  const finTimestamp = useRef(null);
  const navigate = useNavigate();

  //Carga la sesión y las butacas seleccionadas
  useEffect(() => {
    const fetchSesion = async () => {
      if (!sesionId) return;

      try {
        const res = await axios.get(`${Config.urlBackend}/sesiones/${sesionId}`);
        setSesiones(res.data);
        const resButacas = await axios.get(`${Config.urlBackend}/butacas/lista?ids=${butacasSeleccionadas}`);
        setButacas(resButacas.data);
      } catch (err) {
        console.error('Error al cargar la sesión y butacas:', err);
      }
    };

    fetchSesion();
  }, [sesionId]);

  //Método para redirigir al inicio despues de la compra
  useEffect(() => {
    if (contador !== 5) return;

    setMensajeGuardado("Compra realizada correctamente. Serás redirigido en unos segundos...");

    const mostrarLoaderTimer = setTimeout(() => {
      setMostrandoLoader(true);
    }, 3000);

    const redirigirTimer = setTimeout(() => {
      navigate('/');
    }, 8000);

    return () => {
      clearTimeout(mostrarLoaderTimer);
      clearTimeout(redirigirTimer);
    };
  }, [contador, navigate]);


  //Método para el temporizador de la compra
  useEffect(() => {
    if (contador === 5) return;

    // Establecemos la marca de tiempo final con la duración inicial para el temporizador
    finTimestamp.current = Date.now() + tiempoRestante * 1000;


    const actualizarTiempo = () => {
      const ahora = Date.now();
      const diffSegundos = Math.max(0, Math.round((finTimestamp.current - ahora) / 1000));

      setTiempoRestante(diffSegundos);

      if (diffSegundos <= 0) {
        setMostrarPopupTiempo(true);
        clearInterval(intervalo);
      }
    };

    actualizarTiempo();

    const intervalo = setInterval(actualizarTiempo, 1000);

    return () => clearInterval(intervalo);
  }, [contador]);

  //Método para ocultar los mensajes de error despues de 3 segundos
  useEffect(() => {
    if (!mensajeError) return;

    const timer = setTimeout(() => {
      setMensajeError("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [mensajeError]);

  //Método para generar la reserva y actualizar el backend
  const crearReserva = async (data) => {
    setComprando(true);
    try {
      const res = await axios.post(`${Config.urlBackend}/reservas`, data);
      await descargarPDF(res.data.id);
      setContador(5);
    } catch (error) {
      console.error('Error al crear la reserva', error);
    }
  };

  //Método para descargar el PDF
  const descargarPDF = async (reservaId) => {
    try {
      const response = await axios.get(`${Config.urlBackend}/reservas/${reservaId}/pdf`, {
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = "entrada_velvetcinema.pdf";
      if (contentDisposition && contentDisposition.includes("filename=")) {
        filename = contentDisposition.split("filename=")[1].replace(/"/g, "");
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error al descargar el PDF:", error);
    }
  };

  //Método para validar los campos y las butacas seleccionadas
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError("");

    if (butacasSeleccionadas.length === 0) {
      setMensajeError("Por favor, selecciona al menos una butaca.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cliente.email)) {
      setMensajeError("Por favor, introduce un email válido.");
      return;
    }

    const telefonoLimpio = cliente.telefono.replace(/\D/g, '');
    if (telefonoLimpio.length < 9) {
      setMensajeError("Por favor, introduce un número de teléfono válido.");
      return;
    }

    //Datos que se le envian al backend para actualizar la base de datos
    const data = {
      cliente,
      sesionId,
      butacasId: butacasSeleccionadasState,
    };

    await crearReserva(data);
  };

  return (
    <div className="home-container">
      {mostrandoLoader && (
        <div className="loader-overlay">
          <div className="loader"></div>
          <p>Redirigiendo al inicio...</p>
        </div>
      )}
      <HeaderTabs />

      <p><strong>Velvet Cinema</strong></p>
      <div className="info-pelicula">
        <p><strong>Película: </strong> {sesion.peliculaTitulo}, {sesion.strFechaLarga} {sesion.strHora}, {sesion.salaNombre}</p>
        <p><strong>Selección de butacas: </strong>
          {butacas.map(b => `Fila ${b.fila}, Butaca ${b.butaca}`).join(' | ')}
        </p>
      </div>
      <p className="cuenta-atras">
        <FiClock size={24} /> Cuenta atrás {
          String(Math.floor(tiempoRestante / 3600)).padStart(2, '0')
        }:{
          String(Math.floor((tiempoRestante % 3600) / 60)).padStart(2, '0')
        }:{
          String(tiempoRestante % 60).padStart(2, '0')
        }
      </p>

      <form onSubmit={handleSubmit} className="formulario-reserva">
        <div className="campo-formulario">
          <label>Nombre:</label>
          <input
            value={cliente.nombre}
            onChange={e => setCliente({ ...cliente, nombre: e.target.value })}
            required
          />
        </div>
        <div className="campo-formulario">
          <label>Email:</label>
          <input
            value={cliente.email}
            onChange={e => setCliente({ ...cliente, email: e.target.value })}
            required
          />
        </div>
        <div className="campo-formulario">
          <label>Teléfono:</label>
          <input
            value={cliente.telefono}
            onChange={e => setCliente({ ...cliente, telefono: e.target.value })}
            required
          />
        </div>
        {(mensajeError || mensajeGuardado) && (
          <div className="popup-mensaje-peliculas">
            {mensajeError && mensajeError}
            {mensajeGuardado && mensajeGuardado}
          </div>
        )}
        <div className="boton-comprar-container">
          <button
            type="submit"
            className="boton-comprar"
            disabled={comprando}>
            {comprando ? 'Procesando compra...' : 'Confirmar compra'}
          </button>
        </div>
      </form>
      {mostrarPopupTiempo && (
        <div className="popup-overlay">
          <div className="popup-mensaje-peliculas">
            <p>Parece que el tiempo se ha agotado, por favor, selecciona tus butacas de nuevo.</p>
            <button className="boton-repetir-compra" onClick={() => navigate(-1)}>Repetir compra</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reservas;
