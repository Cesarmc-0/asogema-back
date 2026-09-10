-- ============================================================================
--  ASOGEMA - Esquema completo de base de datos (PostgreSQL)
--  Desarrollado por CODEXIUM
-- ============================================================================
--
--  Este script crea TODAS las tablas del proyecto Asogema y carga los datos
--  base necesarios (roles y tipos de documento) para que la aplicación
--  funcione desde cero.
--
--  Uso:
--    createdb asogema
--    psql -U <usuario> -d asogema -f db/asogema.sql
--
--  Notas:
--    - Idempotente en los datos base (usa ON CONFLICT DO NOTHING).
--    - Las tablas se crean solo si no existen.
--    - Requiere PostgreSQL 14+.
--
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TABLAS
-- ----------------------------------------------------------------------------

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categorias_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.categorias_menu (
    id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: categorias_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.categorias_menu_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_menu_id_seq OWNED BY public.categorias_menu.id;


--
-- Name: codigos_descuento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.codigos_descuento (
    id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    porcentaje integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    usos_max integer DEFAULT 0 NOT NULL,
    usos_actuales integer DEFAULT 0 NOT NULL,
    vigencia_hasta timestamp(6) without time zone NOT NULL,
    creado_por bigint,
    created_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    CONSTRAINT codigos_descuento_porcentaje_check CHECK (((porcentaje >= 1) AND (porcentaje <= 100)))
);


--
-- Name: codigos_descuento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.codigos_descuento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: codigos_descuento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.codigos_descuento_id_seq OWNED BY public.codigos_descuento.id;


--
-- Name: detalle_factura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.detalle_factura (
    id bigint NOT NULL,
    factura_id bigint NOT NULL,
    descripcion character varying(200) NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(12,2) GENERATED ALWAYS AS (((cantidad)::numeric * precio_unitario)) STORED,
    CONSTRAINT detalle_factura_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT detalle_factura_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: detalle_factura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.detalle_factura_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_factura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_factura_id_seq OWNED BY public.detalle_factura.id;


--
-- Name: detalle_pedido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.detalle_pedido (
    id bigint NOT NULL,
    pedido_id bigint NOT NULL,
    producto_id bigint NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    subtotal numeric(10,2) GENERATED ALWAYS AS (((cantidad)::numeric * precio_unitario)) STORED,
    CONSTRAINT detalle_pedido_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT detalle_pedido_precio_unitario_check CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: detalle_pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.detalle_pedido_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_pedido_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_pedido_id_seq OWNED BY public.detalle_pedido.id;


--
-- Name: detalle_pedido_online; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.detalle_pedido_online (
    id bigint NOT NULL,
    pedido_online_id bigint NOT NULL,
    producto_id bigint NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    CONSTRAINT detalle_pedido_online_cantidad_check CHECK ((cantidad > 0))
);


--
-- Name: detalle_pedido_online_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.detalle_pedido_online_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_pedido_online_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_pedido_online_id_seq OWNED BY public.detalle_pedido_online.id;


--
-- Name: detalle_servicios_evento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.detalle_servicios_evento (
    id bigint NOT NULL,
    reserva_evento_id bigint NOT NULL,
    servicio_id bigint NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(12,2) GENERATED ALWAYS AS (((cantidad)::numeric * precio_unitario)) STORED,
    CONSTRAINT detalle_servicios_evento_cantidad_check CHECK ((cantidad > 0))
);


--
-- Name: detalle_servicios_evento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.detalle_servicios_evento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_servicios_evento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_servicios_evento_id_seq OWNED BY public.detalle_servicios_evento.id;


--
-- Name: facturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.facturas (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    fecha_factura timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    subtotal numeric(12,2) NOT NULL,
    impuestos numeric(12,2) DEFAULT 0,
    descuentos numeric(12,2) DEFAULT 0,
    total numeric(12,2) NOT NULL,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cufe character varying(100),
    numero_factura character varying(50),
    factus_id character varying(100),
    qr_url text,
    reserva_id bigint,
    tipo_reserva character varying(20),
    codigo_descuento character varying(50),
    pedido_online_id bigint,
    CONSTRAINT facturas_descuentos_check CHECK ((descuentos >= (0)::numeric)),
    CONSTRAINT facturas_estado_check CHECK (((estado)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('PAGADA'::character varying)::text, ('ANULADA'::character varying)::text]))),
    CONSTRAINT facturas_impuestos_check CHECK ((impuestos >= (0)::numeric)),
    CONSTRAINT facturas_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT facturas_total_check CHECK ((total >= (0)::numeric))
);


--
-- Name: facturas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.facturas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: facturas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facturas_id_seq OWNED BY public.facturas.id;


--
-- Name: habitaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.habitaciones (
    id bigint NOT NULL,
    tipo_habitacion_id bigint NOT NULL,
    numero character varying(10) NOT NULL,
    piso smallint NOT NULL,
    descripcion text,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    imagen_url character varying(500),
    CONSTRAINT habitaciones_piso_check CHECK ((piso > 0))
);


--
-- Name: habitaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.habitaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: habitaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.habitaciones_id_seq OWNED BY public.habitaciones.id;


--
-- Name: huespedes_reserva; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.huespedes_reserva (
    id bigint NOT NULL,
    reserva_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    tipo_documento_id bigint NOT NULL,
    numero_documento character varying(20) NOT NULL,
    telefono character varying(20),
    correo character varying(150),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: huespedes_reserva_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.huespedes_reserva_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: huespedes_reserva_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.huespedes_reserva_id_seq OWNED BY public.huespedes_reserva.id;


--
-- Name: imagenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.imagenes (
    id bigint NOT NULL,
    entidad character varying(20) NOT NULL,
    entidad_id bigint NOT NULL,
    url character varying(500) NOT NULL,
    es_principal boolean DEFAULT false NOT NULL,
    orden smallint DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: imagenes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.imagenes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: imagenes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.imagenes_id_seq OWNED BY public.imagenes.id;


--
-- Name: mesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.mesas (
    id bigint NOT NULL,
    numero character varying(10) NOT NULL,
    capacidad smallint NOT NULL,
    ubicacion character varying(100),
    estado character varying(20) DEFAULT 'LIBRE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mesas_capacidad_check CHECK ((capacidad > 0)),
    CONSTRAINT mesas_estado_check CHECK (((estado)::text = ANY (ARRAY[('LIBRE'::character varying)::text, ('OCUPADA'::character varying)::text, ('RESERVADA'::character varying)::text])))
);


--
-- Name: mesas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.mesas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mesas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mesas_id_seq OWNED BY public.mesas.id;


--
-- Name: pagos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pagos (
    id bigint NOT NULL,
    factura_id bigint NOT NULL,
    fecha_pago timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metodo_pago character varying(30) NOT NULL,
    valor numeric(12,2) NOT NULL,
    referencia character varying(100),
    estado character varying(20) DEFAULT 'CONFIRMADO'::character varying,
    payment_link_id text,
    tipo_tarjeta character varying(20),
    CONSTRAINT pagos_estado_check CHECK (((estado)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('CONFIRMADO'::character varying)::text, ('RECHAZADO'::character varying)::text, ('ANULADO'::character varying)::text, ('ERROR'::character varying)::text]))),
    CONSTRAINT pagos_metodo_pago_check CHECK (((metodo_pago)::text = ANY (ARRAY[('EFECTIVO'::character varying)::text, ('TARJETA'::character varying)::text, ('TRANSFERENCIA'::character varying)::text, ('NEQUI'::character varying)::text, ('DAVIPLATA'::character varying)::text, ('SALDO'::character varying)::text, ('PSE'::character varying)::text, ('LINK'::character varying)::text, ('WOMPI'::character varying)::text]))),
    CONSTRAINT pagos_valor_check CHECK ((valor > (0)::numeric))
);


--
-- Name: pagos_hotel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pagos_hotel (
    id bigint NOT NULL,
    reserva_id bigint NOT NULL,
    tipo character varying(10) NOT NULL,
    monto numeric(12,2) NOT NULL,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    metodo_pago character varying(20),
    factura_id bigint,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pagos_hotel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.pagos_hotel_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_hotel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_hotel_id_seq OWNED BY public.pagos_hotel.id;


--
-- Name: pagos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.pagos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_id_seq OWNED BY public.pagos.id;


--
-- Name: pedidos_online; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pedidos_online (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    tipo character varying(20) DEFAULT 'PARA_LLEVAR'::character varying NOT NULL,
    incluye_mesa boolean DEFAULT false NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    descuento numeric(12,2) DEFAULT 0 NOT NULL,
    impuestos numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    estado character varying(20) DEFAULT 'RECIBIDO'::character varying NOT NULL,
    qr_url text,
    created_at timestamp(6) without time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT now() NOT NULL
);


--
-- Name: pedidos_online_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.pedidos_online_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedidos_online_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pedidos_online_id_seq OWNED BY public.pedidos_online.id;


--
-- Name: pedidos_restaurante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pedidos_restaurante (
    id bigint NOT NULL,
    reserva_restaurante_id bigint NOT NULL,
    mesero_id bigint NOT NULL,
    fecha_pedido timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado character varying(20) DEFAULT 'ABIERTO'::character varying NOT NULL,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT pedidos_restaurante_estado_check CHECK (((estado)::text = ANY (ARRAY[('ABIERTO'::character varying)::text, ('EN_PREPARACION'::character varying)::text, ('SERVIDO'::character varying)::text, ('PAGADO'::character varying)::text, ('CANCELADO'::character varying)::text])))
);


--
-- Name: pedidos_restaurante_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.pedidos_restaurante_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedidos_restaurante_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pedidos_restaurante_id_seq OWNED BY public.pedidos_restaurante.id;


--
-- Name: productos_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.productos_menu (
    id bigint NOT NULL,
    categoria_id bigint NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    precio numeric(10,2) NOT NULL,
    stock integer NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    aplica_iva boolean DEFAULT true,
    imagen_url character varying(500),
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT productos_menu_precio_check CHECK ((precio >= (0)::numeric)),
    CONSTRAINT productos_menu_stock_check CHECK ((stock >= 0))
);


--
-- Name: productos_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.productos_menu_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_menu_id_seq OWNED BY public.productos_menu.id;


--
-- Name: resenas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.resenas (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    tipo_servicio character varying(20) NOT NULL,
    calificacion smallint NOT NULL,
    texto character varying(500) NOT NULL,
    fecha_creacion date DEFAULT CURRENT_DATE NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT resenas_calificacion_check CHECK (((calificacion >= 1) AND (calificacion <= 5))),
    CONSTRAINT resenas_tipo_servicio_check CHECK (((tipo_servicio)::text = ANY (ARRAY[('hotel'::character varying)::text, ('restaurant'::character varying)::text, ('events'::character varying)::text])))
);


--
-- Name: resenas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.resenas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: resenas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resenas_id_seq OWNED BY public.resenas.id;


--
-- Name: reservas_evento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.reservas_evento (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    salon_id bigint NOT NULL,
    tipo_evento_id bigint NOT NULL,
    fecha date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    cantidad_personas smallint NOT NULL,
    anticipo numeric(12,2) DEFAULT 0,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reservas_evento_anticipo_check CHECK ((anticipo >= (0)::numeric)),
    CONSTRAINT reservas_evento_cantidad_personas_check CHECK ((cantidad_personas > 0)),
    CONSTRAINT reservas_evento_estado_check CHECK (((estado)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('CONFIRMADA'::character varying)::text, ('EN_CURSO'::character varying)::text, ('FINALIZADA'::character varying)::text, ('CANCELADA'::character varying)::text])))
);


--
-- Name: reservas_evento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.reservas_evento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reservas_evento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reservas_evento_id_seq OWNED BY public.reservas_evento.id;


--
-- Name: reservas_hotel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.reservas_hotel (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    habitacion_id bigint NOT NULL,
    fecha_reserva timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_entrada date NOT NULL,
    fecha_salida date NOT NULL,
    cantidad_huespedes smallint NOT NULL,
    total numeric(12,2) NOT NULL,
    estado character varying(20) NOT NULL,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_fechas CHECK ((fecha_salida > fecha_entrada)),
    CONSTRAINT reservas_hotel_cantidad_huespedes_check CHECK ((cantidad_huespedes > 0)),
    CONSTRAINT reservas_hotel_estado_check CHECK (((estado)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('CONFIRMADA'::character varying)::text, ('CANCELADA'::character varying)::text, ('FINALIZADA'::character varying)::text]))),
    CONSTRAINT reservas_hotel_total_check CHECK ((total >= (0)::numeric))
);


--
-- Name: reservas_hotel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.reservas_hotel_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reservas_hotel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reservas_hotel_id_seq OWNED BY public.reservas_hotel.id;


--
-- Name: reservas_restaurante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.reservas_restaurante (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    mesa_id bigint NOT NULL,
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    cantidad_personas smallint NOT NULL,
    motivo character varying(100),
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    observaciones text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT reservas_restaurante_cantidad_personas_check CHECK ((cantidad_personas > 0)),
    CONSTRAINT reservas_restaurante_estado_check CHECK (((estado)::text = ANY (ARRAY[('PENDIENTE'::character varying)::text, ('CONFIRMADA'::character varying)::text, ('OCUPADA'::character varying)::text, ('FINALIZADA'::character varying)::text, ('CANCELADA'::character varying)::text])))
);


--
-- Name: reservas_restaurante_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.reservas_restaurante_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reservas_restaurante_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reservas_restaurante_id_seq OWNED BY public.reservas_restaurante.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.roles (
    id bigint NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: saldo_recargas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.saldo_recargas (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    monto numeric(12,2) NOT NULL,
    factura_id bigint,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    created_at timestamp(6) without time zone DEFAULT now() NOT NULL
);


--
-- Name: saldo_recargas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.saldo_recargas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saldo_recargas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saldo_recargas_id_seq OWNED BY public.saldo_recargas.id;


--
-- Name: saldos_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.saldos_usuario (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    saldo numeric(12,2) DEFAULT 0 NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT now() NOT NULL
);


--
-- Name: saldos_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.saldos_usuario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saldos_usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saldos_usuario_id_seq OWNED BY public.saldos_usuario.id;


--
-- Name: salones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.salones (
    id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    capacidad smallint NOT NULL,
    ubicacion character varying(150),
    precio_base numeric(12,2) NOT NULL,
    estado character varying(20) DEFAULT 'DISPONIBLE'::character varying NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    imagen_url character varying(500),
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT salones_capacidad_check CHECK ((capacidad > 0)),
    CONSTRAINT salones_estado_check CHECK (((estado)::text = ANY (ARRAY[('DISPONIBLE'::character varying)::text, ('OCUPADO'::character varying)::text, ('MANTENIMIENTO'::character varying)::text]))),
    CONSTRAINT salones_precio_base_check CHECK ((precio_base >= (0)::numeric))
);


--
-- Name: salones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.salones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: salones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.salones_id_seq OWNED BY public.salones.id;


--
-- Name: servicios_evento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.servicios_evento (
    id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    precio numeric(12,2) NOT NULL,
    estado boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT servicios_evento_precio_check CHECK ((precio >= (0)::numeric))
);


--
-- Name: servicios_evento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.servicios_evento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servicios_evento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servicios_evento_id_seq OWNED BY public.servicios_evento.id;


--
-- Name: tareas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tareas (
    id bigint NOT NULL,
    titulo character varying(200) NOT NULL,
    descripcion text,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    prioridad character varying(10) DEFAULT 'MEDIA'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha date,
    hora_inicio time(6) without time zone,
    hora_fin time(6) without time zone,
    asignado_por bigint,
    asignado_a bigint,
    reporte text,
    reporte_imagen_url character varying(500),
    reporte_at timestamp(6) without time zone,
    CONSTRAINT tareas_estado_check CHECK (((estado)::text = ANY (ARRAY['PENDIENTE'::text, 'EN_PROGRESO'::text, 'COMPLETADA'::text, 'CANCELADA'::text]))),
    CONSTRAINT tareas_prioridad_check CHECK (((prioridad)::text = ANY (ARRAY['BAJA'::text, 'MEDIA'::text, 'ALTA'::text])))
);


--
-- Name: tareas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.tareas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tareas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tareas_id_seq OWNED BY public.tareas.id;


--
-- Name: tipos_documento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tipos_documento (
    id bigint NOT NULL,
    nombre character varying(50) NOT NULL,
    abreviatura character varying(10) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tipos_documento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.tipos_documento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_documento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_documento_id_seq OWNED BY public.tipos_documento.id;


--
-- Name: tipos_evento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tipos_evento (
    id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tipos_evento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.tipos_evento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_evento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_evento_id_seq OWNED BY public.tipos_evento.id;


--
-- Name: tipos_habitacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tipos_habitacion (
    id bigint NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    capacidad smallint NOT NULL,
    precio_noche numeric(10,2) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    imagen_url character varying(500),
    CONSTRAINT tipos_habitacion_capacidad_check CHECK ((capacidad > 0)),
    CONSTRAINT tipos_habitacion_precio_noche_check CHECK ((precio_noche >= (0)::numeric))
);


--
-- Name: tipos_habitacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.tipos_habitacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipos_habitacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipos_habitacion_id_seq OWNED BY public.tipos_habitacion.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.usuarios (
    id bigint NOT NULL,
    rol_id bigint NOT NULL,
    tipo_documento_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    numero_documento character varying(20) NOT NULL,
    telefono character varying(20) NOT NULL,
    correo character varying(150) NOT NULL,
    password_hash text NOT NULL,
    fecha_nacimiento date,
    direccion character varying(255),
    estado boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    correo_verificado boolean DEFAULT false NOT NULL
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.usuarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: categorias_menu id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_menu ALTER COLUMN id SET DEFAULT nextval('public.categorias_menu_id_seq'::regclass);


--
-- Name: codigos_descuento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codigos_descuento ALTER COLUMN id SET DEFAULT nextval('public.codigos_descuento_id_seq'::regclass);


--
-- Name: detalle_factura id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura ALTER COLUMN id SET DEFAULT nextval('public.detalle_factura_id_seq'::regclass);


--
-- Name: detalle_pedido id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido ALTER COLUMN id SET DEFAULT nextval('public.detalle_pedido_id_seq'::regclass);


--
-- Name: detalle_pedido_online id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_pedido_online ALTER COLUMN id SET DEFAULT nextval('public.detalle_pedido_online_id_seq'::regclass);


--
-- Name: detalle_servicios_evento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_servicios_evento ALTER COLUMN id SET DEFAULT nextval('public.detalle_servicios_evento_id_seq'::regclass);


--
-- Name: facturas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas ALTER COLUMN id SET DEFAULT nextval('public.facturas_id_seq'::regclass);


--
-- Name: habitaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.habitaciones ALTER COLUMN id SET DEFAULT nextval('public.habitaciones_id_seq'::regclass);


--
-- Name: huespedes_reserva id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.huespedes_reserva ALTER COLUMN id SET DEFAULT nextval('public.huespedes_reserva_id_seq'::regclass);


--
-- Name: imagenes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imagenes ALTER COLUMN id SET DEFAULT nextval('public.imagenes_id_seq'::regclass);


--
-- Name: mesas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas ALTER COLUMN id SET DEFAULT nextval('public.mesas_id_seq'::regclass);


--
-- Name: pagos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos ALTER COLUMN id SET DEFAULT nextval('public.pagos_id_seq'::regclass);


--
-- Name: pagos_hotel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_hotel ALTER COLUMN id SET DEFAULT nextval('public.pagos_hotel_id_seq'::regclass);


--
-- Name: pedidos_online id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_online ALTER COLUMN id SET DEFAULT nextval('public.pedidos_online_id_seq'::regclass);


--
-- Name: pedidos_restaurante id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos_restaurante ALTER COLUMN id SET DEFAULT nextval('public.pedidos_restaurante_id_seq'::regclass);


--
-- Name: productos_menu id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos_menu ALTER COLUMN id SET DEFAULT nextval('public.productos_menu_id_seq'::regclass);


--
-- Name: resenas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resenas ALTER COLUMN id SET DEFAULT nextval('public.resenas_id_seq'::regclass);


--
-- Name: reservas_evento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservas_evento ALTER COLUMN id SET DEFAULT nextval('public.reservas_evento_id_seq'::regclass);


--
-- Name: reservas_hotel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservas_hotel ALTER COLUMN id SET DEFAULT nextval('public.reservas_hotel_id_seq'::regclass);


--
-- Name: reservas_restaurante id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservas_restaurante ALTER COLUMN id SET DEFAULT nextval('public.reservas_restaurante_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: saldo_recargas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saldo_recargas ALTER COLUMN id SET DEFAULT nextval('public.saldo_recargas_id_seq'::regclass);


--
-- Name: saldos_usuario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saldos_usuario ALTER COLUMN id SET DEFAULT nextval('public.saldos_usuario_id_seq'::regclass);


--
-- Name: salones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salones ALTER COLUMN id SET DEFAULT nextval('public.salones_id_seq'::regclass);


--
-- Name: servicios_evento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios_evento ALTER COLUMN id SET DEFAULT nextval('public.servicios_evento_id_seq'::regclass);


--
-- Name: tareas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas ALTER COLUMN id SET DEFAULT nextval('public.tareas_id_seq'::regclass);


--
-- Name: tipos_documento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_documento ALTER COLUMN id SET DEFAULT nextval('public.tipos_documento_id_seq'::regclass);


--
-- Name: tipos_evento id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_evento ALTER COLUMN id SET DEFAULT nextval('public.tipos_evento_id_seq'::regclass);


--
-- Name: tipos_habitacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_habitacion ALTER COLUMN id SET DEFAULT nextval('public.tipos_habitacion_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: categorias_menu categorias_menu_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.categorias_menu
    ADD CONSTRAINT categorias_menu_nombre_key UNIQUE (nombre);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: categorias_menu categorias_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.categorias_menu
    ADD CONSTRAINT categorias_menu_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: codigos_descuento codigos_descuento_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.codigos_descuento
    ADD CONSTRAINT codigos_descuento_codigo_key UNIQUE (codigo);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: codigos_descuento codigos_descuento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.codigos_descuento
    ADD CONSTRAINT codigos_descuento_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: detalle_factura detalle_factura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT detalle_factura_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: detalle_pedido_online detalle_pedido_online_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.detalle_pedido_online
    ADD CONSTRAINT detalle_pedido_online_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: detalle_pedido detalle_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT detalle_pedido_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: detalle_servicios_evento detalle_servicios_evento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.detalle_servicios_evento
    ADD CONSTRAINT detalle_servicios_evento_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: facturas facturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: habitaciones habitaciones_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.habitaciones
    ADD CONSTRAINT habitaciones_numero_key UNIQUE (numero);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: habitaciones habitaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.habitaciones
    ADD CONSTRAINT habitaciones_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: huespedes_reserva huespedes_reserva_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.huespedes_reserva
    ADD CONSTRAINT huespedes_reserva_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: imagenes imagenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.imagenes
    ADD CONSTRAINT imagenes_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: mesas mesas_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_numero_key UNIQUE (numero);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: mesas mesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: pagos_hotel pagos_hotel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.pagos_hotel
    ADD CONSTRAINT pagos_hotel_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: pedidos_online pedidos_online_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.pedidos_online
    ADD CONSTRAINT pedidos_online_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: pedidos_restaurante pedidos_restaurante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.pedidos_restaurante
    ADD CONSTRAINT pedidos_restaurante_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: productos_menu productos_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.productos_menu
    ADD CONSTRAINT productos_menu_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: resenas resenas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.resenas
    ADD CONSTRAINT resenas_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_evento reservas_evento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_evento
    ADD CONSTRAINT reservas_evento_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_hotel reservas_hotel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_hotel
    ADD CONSTRAINT reservas_hotel_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_restaurante reservas_restaurante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_restaurante
    ADD CONSTRAINT reservas_restaurante_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: saldo_recargas saldo_recargas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.saldo_recargas
    ADD CONSTRAINT saldo_recargas_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: saldos_usuario saldos_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.saldos_usuario
    ADD CONSTRAINT saldos_usuario_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: saldos_usuario saldos_usuario_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.saldos_usuario
    ADD CONSTRAINT saldos_usuario_usuario_id_key UNIQUE (usuario_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: salones salones_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.salones
    ADD CONSTRAINT salones_nombre_key UNIQUE (nombre);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: salones salones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.salones
    ADD CONSTRAINT salones_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: servicios_evento servicios_evento_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.servicios_evento
    ADD CONSTRAINT servicios_evento_nombre_key UNIQUE (nombre);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: servicios_evento servicios_evento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.servicios_evento
    ADD CONSTRAINT servicios_evento_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: tareas tareas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: tipos_documento tipos_documento_abreviatura_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.tipos_documento
    ADD CONSTRAINT tipos_documento_abreviatura_key UNIQUE (abreviatura);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: tipos_documento tipos_documento_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.tipos_documento
    ADD CONSTRAINT tipos_documento_nombre_key UNIQUE (nombre);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: tipos_documento tipos_documento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.tipos_documento
    ADD CONSTRAINT tipos_documento_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: tipos_evento tipos_evento_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.tipos_evento
    ADD CONSTRAINT tipos_evento_nombre_key UNIQUE (nombre);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: tipos_evento tipos_evento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.tipos_evento
    ADD CONSTRAINT tipos_evento_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: tipos_habitacion tipos_habitacion_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.tipos_habitacion
    ADD CONSTRAINT tipos_habitacion_nombre_key UNIQUE (nombre);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: tipos_habitacion tipos_habitacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.tipos_habitacion
    ADD CONSTRAINT tipos_habitacion_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_restaurante uq_mesa_fecha_hora; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_restaurante
    ADD CONSTRAINT uq_mesa_fecha_hora UNIQUE (mesa_id, fecha, hora);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: usuarios usuarios_numero_documento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_numero_documento_key UNIQUE (numero_documento);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: idx_facturas_reserva; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_facturas_reserva ON public.facturas USING btree (tipo_reserva, reserva_id);


--
-- Name: idx_imagenes_entidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_imagenes_entidad ON public.imagenes USING btree (entidad, entidad_id);


--
-- Name: idx_pagos_hotel_reserva; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pagos_hotel_reserva ON public.pagos_hotel USING btree (reserva_id);


--
-- Name: idx_pedidos_online_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pedidos_online_usuario ON public.pedidos_online USING btree (usuario_id, created_at);


--
-- Name: idx_resenas_servicio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_resenas_servicio ON public.resenas USING btree (tipo_servicio) WHERE activo;


--
-- Name: idx_saldo_recargas_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_saldo_recargas_usuario ON public.saldo_recargas USING btree (usuario_id, created_at);


--
-- Name: idx_tareas_asignado_a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tareas_asignado_a ON public.tareas USING btree (asignado_a);


--
-- Name: idx_tareas_asignado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tareas_asignado_por ON public.tareas USING btree (asignado_por);


--
-- Name: idx_tareas_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tareas_estado ON public.tareas USING btree (estado);


--
-- Name: idx_tareas_prioridad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tareas_prioridad ON public.tareas USING btree (prioridad);


--
-- Name: detalle_factura fk_detalle_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT fk_detalle_factura FOREIGN KEY (factura_id) REFERENCES public.facturas(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: detalle_pedido fk_detalle_pedido; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT fk_detalle_pedido FOREIGN KEY (pedido_id) REFERENCES public.pedidos_restaurante(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: detalle_pedido fk_detalle_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.detalle_pedido
    ADD CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id) REFERENCES public.productos_menu(id) ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: detalle_servicios_evento fk_detalle_reserva_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.detalle_servicios_evento
    ADD CONSTRAINT fk_detalle_reserva_evento FOREIGN KEY (reserva_evento_id) REFERENCES public.reservas_evento(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: detalle_servicios_evento fk_detalle_servicio_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.detalle_servicios_evento
    ADD CONSTRAINT fk_detalle_servicio_evento FOREIGN KEY (servicio_id) REFERENCES public.servicios_evento(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: facturas fk_factura_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT fk_factura_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: habitaciones fk_habitacion_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.habitaciones
    ADD CONSTRAINT fk_habitacion_tipo FOREIGN KEY (tipo_habitacion_id) REFERENCES public.tipos_habitacion(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: huespedes_reserva fk_huesped_reserva; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.huespedes_reserva
    ADD CONSTRAINT fk_huesped_reserva FOREIGN KEY (reserva_id) REFERENCES public.reservas_hotel(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: huespedes_reserva fk_huesped_tipo_documento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.huespedes_reserva
    ADD CONSTRAINT fk_huesped_tipo_documento FOREIGN KEY (tipo_documento_id) REFERENCES public.tipos_documento(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: pagos fk_pago_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT fk_pago_factura FOREIGN KEY (factura_id) REFERENCES public.facturas(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: pedidos_restaurante fk_pedido_mesero; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.pedidos_restaurante
    ADD CONSTRAINT fk_pedido_mesero FOREIGN KEY (mesero_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: pedidos_restaurante fk_pedido_reserva; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.pedidos_restaurante
    ADD CONSTRAINT fk_pedido_reserva FOREIGN KEY (reserva_restaurante_id) REFERENCES public.reservas_restaurante(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: productos_menu fk_producto_categoria; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.productos_menu
    ADD CONSTRAINT fk_producto_categoria FOREIGN KEY (categoria_id) REFERENCES public.categorias_menu(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_evento fk_reserva_evento_salon; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_evento
    ADD CONSTRAINT fk_reserva_evento_salon FOREIGN KEY (salon_id) REFERENCES public.salones(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_evento fk_reserva_evento_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_evento
    ADD CONSTRAINT fk_reserva_evento_tipo FOREIGN KEY (tipo_evento_id) REFERENCES public.tipos_evento(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_evento fk_reserva_evento_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_evento
    ADD CONSTRAINT fk_reserva_evento_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_hotel fk_reserva_habitacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_hotel
    ADD CONSTRAINT fk_reserva_habitacion FOREIGN KEY (habitacion_id) REFERENCES public.habitaciones(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_restaurante fk_reserva_rest_mesa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_restaurante
    ADD CONSTRAINT fk_reserva_rest_mesa FOREIGN KEY (mesa_id) REFERENCES public.mesas(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_restaurante fk_reserva_rest_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_restaurante
    ADD CONSTRAINT fk_reserva_rest_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: reservas_hotel fk_reserva_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.reservas_hotel
    ADD CONSTRAINT fk_reserva_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: usuarios fk_usuario_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES public.roles(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: usuarios fk_usuario_tipo_documento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuario_tipo_documento FOREIGN KEY (tipo_documento_id) REFERENCES public.tipos_documento(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: pagos_hotel pagos_hotel_reserva_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.pagos_hotel
    ADD CONSTRAINT pagos_hotel_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES public.reservas_hotel(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
-- Name: resenas resenas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
ALTER TABLE ONLY public.resenas
    ADD CONSTRAINT resenas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


--
--



-- ----------------------------------------------------------------------------
-- 2. DATOS BASE (obligatorios para el funcionamiento de la aplicación)
-- ----------------------------------------------------------------------------
-- Sin estos registros el backend falla: el registro de usuarios exige el rol
-- "Cliente" y un tipo de documento; el bootstrap crea el admin con rol
-- "Administrador". El script es idempotente (ON CONFLICT DO NOTHING).

-- Roles del sistema (comparación case-sensitive en roles.guard.ts)
INSERT INTO public.roles (id, nombre, descripcion, estado) VALUES
  (1, 'Administrador', 'Acceso total al sistema', true),
  (2, 'Gerente',       'Supervisa la operación del club', true),
  (3, 'Recepcionista', 'Gestiona reservas del hotel', true),
  (4, 'Mesero',        'Gestiona pedidos del restaurante', true),
  (5, 'Cliente',       'Utiliza los servicios del club', true),
  (6, 'Comanda',       'Encargado de preparar y notificar pedidos de la comanda', true)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.roles', 'id'), (SELECT MAX(id) FROM public.roles));

-- Tipos de documento (el registro y el seed requieren al menos id=1)
INSERT INTO public.tipos_documento (id, nombre, abreviatura, estado) VALUES
  (1, 'Cédula de Ciudadanía',  'CC',  true),
  (2, 'Tarjeta de Identidad',  'TI',  true),
  (3, 'Cédula de Extranjería', 'CE',  true),
  (4, 'Pasaporte',             'PA',  true),
  (5, 'NIT',                   'NIT', true)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.tipos_documento', 'id'), (SELECT MAX(id) FROM public.tipos_documento));

COMMIT;

-- ============================================================================
--  FIN DEL SCRIPT
--  Siguiente paso: configurar el .env y ejecutar `pnpm prisma:seed`
--  para crear el usuario administrador y los datos de ejemplo.
-- ============================================================================
